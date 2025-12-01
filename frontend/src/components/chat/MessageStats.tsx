import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import {
  Psychology as AIIcon,
  Token as TokenIcon,
  Speed as SpeedIcon,
  Input as InputIcon,
  Output as OutputIcon,
} from '@mui/icons-material';

interface MessageStatsProps {
  tokensUsed?: number;
  tokensPerSecond?: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}

const MessageStats: React.FC<MessageStatsProps> = ({ 
  tokensUsed, 
  tokensPerSecond, 
  model,
  promptTokens,
  completionTokens
}) => {
  const hasAnyStats = tokensUsed || tokensPerSecond || model || promptTokens || completionTokens;
  if (!hasAnyStats) return null;

  // Use precise token counts if available, fallback to tokensUsed
  const totalTokens = (promptTokens && completionTokens) 
    ? promptTokens + completionTokens 
    : tokensUsed;

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5, flexWrap: 'wrap' }}>
      {model && (
        <Tooltip title="Model used">
          <Chip
            icon={<AIIcon sx={{ fontSize: '14px !important' }} />}
            label={model}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        </Tooltip>
      )}
      
      {/* Show detailed token breakdown if available */}
      {promptTokens !== undefined && (
        <Tooltip title="Input tokens (prompt)">
          <Chip
            icon={<InputIcon sx={{ fontSize: '14px !important' }} />}
            label={`${promptTokens.toLocaleString()} in`}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        </Tooltip>
      )}
      
      {completionTokens !== undefined && (
        <Tooltip title="Output tokens (completion)">
          <Chip
            icon={<OutputIcon sx={{ fontSize: '14px !important' }} />}
            label={`${completionTokens.toLocaleString()} out`}
            size="small"
            variant="outlined"
            color="success"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        </Tooltip>
      )}
      
      {/* Total tokens */}
      {totalTokens !== undefined && (
        <Tooltip title="Total tokens">
          <Chip
            icon={<TokenIcon sx={{ fontSize: '14px !important' }} />}
            label={`${totalTokens.toLocaleString()} total`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        </Tooltip>
      )}
      
      {tokensPerSecond !== undefined && tokensPerSecond > 0 && (
        <Tooltip title="Generation speed">
          <Chip
            icon={<SpeedIcon sx={{ fontSize: '14px !important' }} />}
            label={`${tokensPerSecond.toFixed(1)} tok/s`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        </Tooltip>
      )}
    </Box>
  );
};

export default MessageStats;
