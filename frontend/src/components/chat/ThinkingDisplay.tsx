import React, { useState } from 'react';
import { Box, Paper, Typography, Collapse } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

interface ThinkingDisplayProps {
  content: string;
  isStreaming?: boolean;
}

const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({ content, isStreaming = false }) => {
  const [expanded, setExpanded] = useState(true);

  if (!content && !isStreaming) return null;

  return (
    <Box sx={{ mb: 2, maxWidth: '85%' }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: isStreaming ? 'primary.main' : 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          bgcolor: isStreaming ? alpha('#2563eb', 0.04) : 'grey.50',
        }}
      >
        {/* Header */}
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: isStreaming ? alpha('#2563eb', 0.08) : 'grey.100',
            },
          }}
        >
          {/* Animated dots */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: isStreaming ? 'primary.main' : 'grey.500',
                  animation: isStreaming ? 'pulse 1.4s ease-in-out infinite' : 'none',
                  animationDelay: `${i * 0.2}s`,
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
                    '50%': { opacity: 1, transform: 'scale(1.2)' },
                  },
                }}
              />
            ))}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: isStreaming ? 'primary.main' : 'text.secondary',
              flexGrow: 1,
            }}
          >
            {isStreaming ? 'Thinking...' : 'Thinking process'}
          </Typography>
          <ExpandMoreIcon
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
              color: isStreaming ? 'primary.main' : 'text.secondary',
              fontSize: 20,
            }}
          />
        </Box>

        {/* Content */}
        <Collapse in={expanded} timeout="auto">
          <Box
            sx={{
              p: 2,
              pt: 1,
              borderTop: '1px solid',
              borderColor: isStreaming ? alpha('#2563eb', 0.2) : 'divider',
              bgcolor: 'background.paper',
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                color: 'text.secondary',
                fontFamily: '"Fira Code", monospace',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
              }}
            >
              {content || 'Preparing to think...'}
            </Typography>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default ThinkingDisplay;
