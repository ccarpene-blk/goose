import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';

interface ConversationLimitsDropdownProps {
  maxTurns: number;
  onMaxTurnsChange: (value: number) => void;
  flushToolResponses: boolean;
  onFlushToolResponsesChange: (value: boolean) => void;
  originValidationEnabled: boolean;
  onOriginValidationEnabledChange: (value: boolean) => void;
  originValidationRequireApproval: boolean;
  onOriginValidationRequireApprovalChange: (value: boolean) => void;
  originValidationExemptedTools: string;
  onOriginValidationExemptedToolsChange: (value: string) => void;
}

export const ConversationLimitsDropdown = ({
  maxTurns,
  onMaxTurnsChange,
  flushToolResponses,
  onFlushToolResponsesChange,
  originValidationEnabled,
  onOriginValidationEnabledChange,
  originValidationRequireApproval,
  onOriginValidationRequireApprovalChange,
  originValidationExemptedTools,
  onOriginValidationExemptedToolsChange,
}: ConversationLimitsDropdownProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="pt-4">
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between py-2 px-2 hover:bg-background-muted rounded-lg transition-all group"
      >
        <h3 className="text-text-default">Conversation Limits & Security</h3>

        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform duration-200 ease-in-out ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        <div className="space-y-3 pb-2">
          <div className="flex items-center justify-between py-2 px-2 bg-background-subtle rounded-lg transform transition-all duration-200 ease-in-out">
            <div>
              <h4 className="text-text-default text-sm">Max Turns</h4>
              <p className="text-xs text-text-muted mt-[2px]">
                Maximum agent turns before Goose asks for user input
              </p>
            </div>
            <Input
              type="number"
              min="1"
              max="10000"
              value={maxTurns}
              onChange={(e) => onMaxTurnsChange(Number(e.target.value))}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between py-2 px-2 bg-background-subtle rounded-lg transform transition-all duration-200 ease-in-out">
            <div className="flex-1 pr-4">
              <h4 className="text-text-default text-sm">Flush Tool Responses</h4>
              <p className="text-xs text-text-muted mt-[2px]">
                Remove tool response content from conversation history between user turns to prevent prompt injection attacks from persisting
              </p>
            </div>
            <Switch
              checked={flushToolResponses}
              onCheckedChange={onFlushToolResponsesChange}
              variant="mono"
            />
          </div>

          <div className="flex items-center justify-between py-2 px-2 bg-background-subtle rounded-lg transform transition-all duration-200 ease-in-out">
            <div className="flex-1 pr-4">
              <h4 className="text-text-default text-sm">Origin Validation</h4>
              <p className="text-xs text-text-muted mt-[2px]">
                Detect and flag cross-origin tool calls that may indicate prompt injection attacks
              </p>
            </div>
            <Switch
              checked={originValidationEnabled}
              onCheckedChange={onOriginValidationEnabledChange}
              variant="mono"
            />
          </div>

          {originValidationEnabled && (
            <>
              <div className="flex items-center justify-between py-2 px-2 bg-background-subtle rounded-lg transform transition-all duration-200 ease-in-out">
                <div className="flex-1 pr-4">
                  <h4 className="text-text-default text-sm">Require Approval for Cross-Origin Calls</h4>
                  <p className="text-xs text-text-muted mt-[2px]">
                    When enabled, cross-origin tool calls will require user approval before execution
                  </p>
                </div>
                <Switch
                  checked={originValidationRequireApproval}
                  onCheckedChange={onOriginValidationRequireApprovalChange}
                  variant="mono"
                />
              </div>

              <div className="flex flex-col py-2 px-2 bg-background-subtle rounded-lg transform transition-all duration-200 ease-in-out">
                <div className="mb-2">
                  <h4 className="text-text-default text-sm">Exempted Tools</h4>
                  <p className="text-xs text-text-muted mt-[2px]">
                    Comma-separated list of tool names exempt from origin validation (e.g., read-only tools)
                  </p>
                </div>
                <Input
                  type="text"
                  value={originValidationExemptedTools}
                  onChange={(e) => onOriginValidationExemptedToolsChange(e.target.value)}
                  placeholder="final_output,read,list,ls,glob,grep,get"
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
