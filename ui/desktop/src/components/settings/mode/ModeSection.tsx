import { useEffect, useState, useCallback } from 'react';
import { all_goose_modes, ModeSelectionItem } from './ModeSelectionItem';
import { useConfig } from '../../ConfigContext';
import { ConversationLimitsDropdown } from './ConversationLimitsDropdown';

export const ModeSection = () => {
  const [currentMode, setCurrentMode] = useState('auto');
  const [maxTurns, setMaxTurns] = useState<number>(1000);
  const [flushToolResponses, setFlushToolResponses] = useState<boolean>(false);
  const [originValidationEnabled, setOriginValidationEnabled] = useState<boolean>(true);
  const [originValidationRequireApproval, setOriginValidationRequireApproval] = useState<boolean>(true);
  const [originValidationExemptedTools, setOriginValidationExemptedTools] = useState<string>('final_output,read,list,ls,glob,grep,get');
  const { read, upsert } = useConfig();

  const handleModeChange = async (newMode: string) => {
    try {
      await upsert('GOOSE_MODE', newMode, false);
      setCurrentMode(newMode);
    } catch (error) {
      console.error('Error updating goose mode:', error);
      throw new Error(`Failed to store new goose mode: ${newMode}`);
    }
  };

  const fetchCurrentMode = useCallback(async () => {
    try {
      const mode = (await read('GOOSE_MODE', false)) as string;
      if (mode) {
        setCurrentMode(mode);
      }
    } catch (error) {
      console.error('Error fetching current mode:', error);
    }
  }, [read]);

  const fetchMaxTurns = useCallback(async () => {
    try {
      const turns = (await read('GOOSE_MAX_TURNS', false)) as number;
      if (turns) {
        setMaxTurns(turns);
      }
    } catch (error) {
      console.error('Error fetching max turns:', error);
    }
  }, [read]);

  const fetchFlushToolResponses = useCallback(async () => {
    try {
      const flush = (await read('GOOSE_FLUSH_TOOL_RESPONSES', false)) as boolean;
      if (flush !== undefined && flush !== null) {
        setFlushToolResponses(flush);
      }
    } catch (error) {
      console.error('Error fetching flush tool responses setting:', error);
    }
  }, [read]);

  const fetchOriginValidationEnabled = useCallback(async () => {
    try {
      const enabled = (await read('ORIGIN_VALIDATION_ENABLED', false)) as boolean;
      if (enabled !== undefined && enabled !== null) {
        setOriginValidationEnabled(enabled);
      }
    } catch (error) {
      console.error('Error fetching origin validation enabled setting:', error);
    }
  }, [read]);

  const fetchOriginValidationRequireApproval = useCallback(async () => {
    try {
      const requireApproval = (await read('ORIGIN_VALIDATION_REQUIRE_APPROVAL', false)) as boolean;
      if (requireApproval !== undefined && requireApproval !== null) {
        setOriginValidationRequireApproval(requireApproval);
      }
    } catch (error) {
      console.error('Error fetching origin validation require approval setting:', error);
    }
  }, [read]);

  const fetchOriginValidationExemptedTools = useCallback(async () => {
    try {
      const exemptedTools = (await read('ORIGIN_VALIDATION_EXEMPTED_TOOLS', false)) as string;
      if (exemptedTools) {
        setOriginValidationExemptedTools(exemptedTools);
      }
    } catch (error) {
      console.error('Error fetching origin validation exempted tools setting:', error);
    }
  }, [read]);

  const handleMaxTurnsChange = async (value: number) => {
    try {
      await upsert('GOOSE_MAX_TURNS', value, false);
      setMaxTurns(value);
    } catch (error) {
      console.error('Error updating max turns:', error);
    }
  };

  const handleFlushToolResponsesChange = async (value: boolean) => {
    try {
      await upsert('GOOSE_FLUSH_TOOL_RESPONSES', value, false);
      setFlushToolResponses(value);
    } catch (error) {
      console.error('Error updating flush tool responses:', error);
    }
  };

  const handleOriginValidationEnabledChange = async (value: boolean) => {
    try {
      await upsert('ORIGIN_VALIDATION_ENABLED', value, false);
      setOriginValidationEnabled(value);
    } catch (error) {
      console.error('Error updating origin validation enabled:', error);
    }
  };

  const handleOriginValidationRequireApprovalChange = async (value: boolean) => {
    try {
      await upsert('ORIGIN_VALIDATION_REQUIRE_APPROVAL', value, false);
      setOriginValidationRequireApproval(value);
    } catch (error) {
      console.error('Error updating origin validation require approval:', error);
    }
  };

  const handleOriginValidationExemptedToolsChange = async (value: string) => {
    try {
      await upsert('ORIGIN_VALIDATION_EXEMPTED_TOOLS', value, false);
      setOriginValidationExemptedTools(value);
    } catch (error) {
      console.error('Error updating origin validation exempted tools:', error);
    }
  };

  useEffect(() => {
    fetchCurrentMode();
    fetchMaxTurns();
    fetchFlushToolResponses();
    fetchOriginValidationEnabled();
    fetchOriginValidationRequireApproval();
    fetchOriginValidationExemptedTools();
  }, [fetchCurrentMode, fetchMaxTurns, fetchFlushToolResponses, fetchOriginValidationEnabled, fetchOriginValidationRequireApproval, fetchOriginValidationExemptedTools]);

  return (
    <div className="space-y-1">
      {/* Mode Selection */}
      {all_goose_modes.map((mode) => (
        <ModeSelectionItem
          key={mode.key}
          mode={mode}
          currentMode={currentMode}
          showDescription={true}
          isApproveModeConfigure={false}
          handleModeChange={handleModeChange}
        />
      ))}

      {/* Conversation Limits & Security Dropdown */}
      <ConversationLimitsDropdown
        maxTurns={maxTurns}
        onMaxTurnsChange={handleMaxTurnsChange}
        flushToolResponses={flushToolResponses}
        onFlushToolResponsesChange={handleFlushToolResponsesChange}
        originValidationEnabled={originValidationEnabled}
        onOriginValidationEnabledChange={handleOriginValidationEnabledChange}
        originValidationRequireApproval={originValidationRequireApproval}
        onOriginValidationRequireApprovalChange={handleOriginValidationRequireApprovalChange}
        originValidationExemptedTools={originValidationExemptedTools}
        onOriginValidationExemptedToolsChange={handleOriginValidationExemptedToolsChange}
      />
    </div>
  );
};
