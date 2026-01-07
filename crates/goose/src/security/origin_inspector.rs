use crate::agents::ToolCallWindowState;
use crate::config::Config;
use crate::conversation::message::{Message, ToolRequest};
use crate::tool_inspection::{InspectionAction, InspectionResult, ToolInspector};
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

/// Configuration for origin validation behavior
#[derive(Clone, Debug)]
pub struct OriginInspectorConfig {
    /// Whether origin validation is enabled
    pub enabled: bool,

    /// Whether to require approval for cross-origin calls
    /// (if false, just logs warnings but allows)
    pub require_approval: bool,

    /// Tools that are exempt from origin validation
    /// (e.g., read-only tools, final_output)
    pub exempted_tools: Vec<String>,
}

impl OriginInspectorConfig {
    pub fn from_config() -> Self {
        let config = Config::global();

        let enabled = config
            .get_param::<bool>("ORIGIN_VALIDATION_ENABLED")
            .unwrap_or(true); // Enabled by default for security

        let require_approval = config
            .get_param::<bool>("ORIGIN_VALIDATION_REQUIRE_APPROVAL")
            .unwrap_or(true); // Require approval by default

        // Parse exempted tools from config (comma-separated list)
        let exempted_tools_str = config
            .get_param::<String>("ORIGIN_VALIDATION_EXEMPTED_TOOLS")
            .unwrap_or_else(|_| {
                // Default exempted tools - read-only operations and final_output
                "final_output,read,list,ls,glob,grep,get".to_string()
            });

        let exempted_tools = exempted_tools_str
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        Self {
            enabled,
            require_approval,
            exempted_tools,
        }
    }
}

/// Inspector that validates whether tool calls might originate from
/// poisoned tool responses (prompt injection attacks)
pub struct OriginInspector {
    /// Reference to agent's tool-call window state
    tool_call_window_state: Arc<Mutex<ToolCallWindowState>>,

    /// Configuration for origin validation behavior
    config: OriginInspectorConfig,
}

impl OriginInspector {
    pub fn new(tool_call_window_state: Arc<Mutex<ToolCallWindowState>>) -> Self {
        let config = OriginInspectorConfig::from_config();

        tracing::info!(
            enabled = config.enabled,
            require_approval = config.require_approval,
            exempted_tools = ?config.exempted_tools,
            "Initializing OriginInspector"
        );

        Self {
            tool_call_window_state,
            config,
        }
    }

    /// Check if a tool is exempted from origin validation
    fn is_tool_exempted(&self, tool_name: &str) -> bool {
        self.config.exempted_tools.iter().any(|exempted| {
            // Support both exact match and prefix match
            tool_name == exempted || tool_name.starts_with(exempted)
        })
    }
}

#[async_trait]
impl ToolInspector for OriginInspector {
    fn name(&self) -> &'static str {
        "origin"
    }

    async fn inspect(
        &self,
        tool_requests: &[ToolRequest],
        _messages: &[Message],
    ) -> Result<Vec<InspectionResult>> {
        let state = self.tool_call_window_state.lock().await;

        if !state.in_window {
            // Not in tool-call window, all tools are considered same-origin
            tracing::debug!(
                tool_count = tool_requests.len(),
                "Not in tool-call window, all tools are same-origin"
            );
            return Ok(vec![]);
        }

        let mut results = Vec::new();

        for request in tool_requests {
            if let Ok(tool_call) = &request.tool_call {
                // Check if tool is exempted
                if self.is_tool_exempted(&tool_call.name) {
                    tracing::debug!(
                        tool_name = %tool_call.name,
                        tool_request_id = %request.id,
                        "Tool exempted from origin validation"
                    );
                    continue;
                }

                // We're in a tool-call window, this is a cross-origin request
                let action = if self.config.require_approval {
                    InspectionAction::RequireApproval(Some(format!(
                        "The tool '{}' was requested after executing other tools. \
                         This could be a prompt injection attack where malicious content \
                         in tool responses is trying to trigger unauthorized actions. \
                         Please verify this action is intended.",
                        tool_call.name
                    )))
                } else {
                    InspectionAction::Allow
                };

                let finding_id = format!("ORIGIN-{}", Uuid::new_v4().simple());

                tracing::warn!(
                    counter.goose.origin_validation_cross_origin_detected = 1,
                    tool_name = %tool_call.name,
                    tool_request_id = %request.id,
                    finding_id = %finding_id,
                    tools_invoked_this_turn = ?state.tools_invoked_this_turn,
                    require_approval = self.config.require_approval,
                    "Cross-origin tool call detected during tool-call window"
                );

                results.push(InspectionResult {
                    tool_request_id: request.id.clone(),
                    action,
                    reason: format!(
                        "Cross-origin tool call: '{}' requested during tool-call window (after executing: {:?})",
                        tool_call.name, state.tools_invoked_this_turn
                    ),
                    confidence: 0.7,
                    inspector_name: "origin".to_string(),
                    finding_id: Some(finding_id),
                });
            }
        }

        if !results.is_empty() {
            tracing::info!(
                counter.goose.origin_validation_performed = 1,
                cross_origin_tools = results.len(),
                "Origin validation complete - cross-origin tools detected"
            );
        }

        Ok(results)
    }

    fn is_enabled(&self) -> bool {
        self.config.enabled
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rmcp::model::CallToolRequestParam;
    use rmcp::object;

    #[tokio::test]
    async fn test_origin_inspector_not_in_window() {
        let window_state = Arc::new(Mutex::new(ToolCallWindowState::new()));
        let inspector = OriginInspector::new(window_state.clone());

        let tool_request = ToolRequest {
            id: "req_1".to_string(),
            tool_call: Ok(CallToolRequestParam {
                name: "write_file".into(),
                arguments: Some(object!({})),
            }),
            metadata: None,
            tool_meta: None,
        };

        let results = inspector
            .inspect(&[tool_request], &[])
            .await
            .unwrap();

        // Not in window, should be empty
        assert_eq!(results.len(), 0);
    }

    #[tokio::test]
    async fn test_origin_inspector_in_window_non_exempted_tool() {
        let window_state = Arc::new(Mutex::new(ToolCallWindowState::new()));

        // Set window state to in_window
        {
            let mut state = window_state.lock().await;
            state.enter_tool_call_window();
            state.add_invoked_tool("read_file".to_string());
        }

        let inspector = OriginInspector::new(window_state.clone());

        let tool_request = ToolRequest {
            id: "req_1".to_string(),
            tool_call: Ok(CallToolRequestParam {
                name: "write_file".into(),
                arguments: Some(object!({})),
            }),
            metadata: None,
            tool_meta: None,
        };

        let results = inspector
            .inspect(&[tool_request], &[])
            .await
            .unwrap();

        // Should flag as cross-origin
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].tool_request_id, "req_1");
        assert_eq!(results[0].inspector_name, "origin");
        assert!(results[0].finding_id.is_some());
        assert!(results[0]
            .finding_id
            .as_ref()
            .unwrap()
            .starts_with("ORIGIN-"));
    }

    #[tokio::test]
    async fn test_origin_inspector_exempted_tool() {
        let window_state = Arc::new(Mutex::new(ToolCallWindowState::new()));

        // Set window state to in_window
        {
            let mut state = window_state.lock().await;
            state.enter_tool_call_window();
            state.add_invoked_tool("write_file".to_string());
        }

        let inspector = OriginInspector::new(window_state.clone());

        let tool_request = ToolRequest {
            id: "req_1".to_string(),
            tool_call: Ok(CallToolRequestParam {
                name: "final_output".into(),
                arguments: Some(object!({})),
            }),
            metadata: None,
            tool_meta: None,
        };

        let results = inspector
            .inspect(&[tool_request], &[])
            .await
            .unwrap();

        // Should be exempted, no results
        assert_eq!(results.len(), 0);
    }

    #[tokio::test]
    async fn test_tool_call_window_state_reset() {
        let mut state = ToolCallWindowState::new();

        state.enter_tool_call_window();
        state.add_invoked_tool("tool1".to_string());
        state.add_invoked_tool("tool2".to_string());

        assert!(state.in_window);
        assert_eq!(state.tools_invoked_this_turn.len(), 2);

        state.reset_for_user_turn();

        assert!(!state.in_window);
        assert_eq!(state.tools_invoked_this_turn.len(), 0);
        assert!(state.last_user_message_time.is_some());
    }

    #[tokio::test]
    async fn test_tool_call_window_state_no_duplicates() {
        let mut state = ToolCallWindowState::new();

        state.add_invoked_tool("tool1".to_string());
        state.add_invoked_tool("tool1".to_string());
        state.add_invoked_tool("tool2".to_string());

        assert_eq!(state.tools_invoked_this_turn.len(), 2);
        assert!(state.tools_invoked_this_turn.contains(&"tool1".to_string()));
        assert!(state.tools_invoked_this_turn.contains(&"tool2".to_string()));
    }
}
