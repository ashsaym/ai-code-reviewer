import React from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Send as SendIcon, Stop as StopIcon } from '@mui/icons-material';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  totalTokens?: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = 'Type your message... (Shift+Enter for new line)',
  totalTokens = 0,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Box>
      {/* Input area */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || isStreaming}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
            },
          }}
        />
        
        {isStreaming ? (
          <Tooltip title="Stop generation">
            <IconButton color="error" onClick={onStop} sx={{ p: 1.5 }}>
              <StopIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Send message">
            <IconButton
              color="primary"
              onClick={onSend}
              disabled={!value.trim() || disabled}
              sx={{
                p: 1.5,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                '&:disabled': { bgcolor: 'grey.300' },
              }}
            >
              <SendIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default ChatInput;
