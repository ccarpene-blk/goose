import { useEffect, useState, useCallback } from 'react';
import { all_goose_modes, ModeSelectionItem } from './ModeSelectionItem';
import { useConfig } from '../../ConfigContext';
import { ConversationLimitsDropdown } from './ConversationLimitsDropdown';

export const ModeSection = () => {
  const [currentMode, setCurrentMode] = useState('auto');
  const [maxTurns, setMaxTurns] = useState<number>(1000);
  const [flushToolResponses, setFlushToolResponses] = useState<boolean>(false);
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

  useEffect(() => {
    fetchCurrentMode();
    fetchMaxTurns();
    fetchFlushToolResponses();
  }, [fetchCurrentMode, fetchMaxTurns, fetchFlushToolResponses]);

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
      />
    </div>
  );
};
