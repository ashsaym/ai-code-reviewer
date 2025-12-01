import React, { useState } from 'react';
import { Box, Paper, Typography, Collapse, Chip, alpha } from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, 
  Description as FileIcon,
  Code as CodeIcon 
} from '@mui/icons-material';
import { FileRelevance } from '../../types';

interface FileRelevanceDisplayProps {
  files: FileRelevance[];
  onFileClick?: (filePath: string) => void;
}

const FileRelevanceDisplay: React.FC<FileRelevanceDisplayProps> = ({ files, onFileClick }) => {
  const [expanded, setExpanded] = useState(false);

  if (!files || files.length === 0) return null;

  // Filter out invalid files and ensure relevance_percent is defined
  const validFiles = files.filter(f => f && typeof f.relevance_percent === 'number');
  if (validFiles.length === 0) return null;

  const getRelevanceColor = (percent: number) => {
    if (percent > 70) return '#10b981';
    if (percent > 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <Box sx={{ mb: 2, maxWidth: '85%' }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            cursor: 'pointer',
            bgcolor: alpha('#10b981', 0.05),
            '&:hover': { bgcolor: alpha('#10b981', 0.1) },
          }}
        >
          <FileIcon sx={{ fontSize: 18, color: '#10b981' }} />
          <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1 }}>
            {validFiles.length} relevant file{validFiles.length > 1 ? 's' : ''} found
          </Typography>
          <ExpandMoreIcon
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
              fontSize: 20,
            }}
          />
        </Box>

        {/* File list */}
        <Collapse in={expanded} timeout="auto">
          <Box sx={{ p: 2, pt: 1, maxHeight: 200, overflowY: 'auto' }}>
            {validFiles.map((file, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.75,
                  px: 1,
                  borderRadius: 1,
                  cursor: onFileClick ? 'pointer' : 'default',
                  '&:hover': onFileClick ? { bgcolor: 'action.hover' } : {},
                }}
                onClick={() => onFileClick?.(file.file_path)}
              >
                <CodeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>
                  {file.file_path}
                </Typography>
                <Chip
                  label={`${file.relevance_percent.toFixed(1)}%`}
                  size="small"
                  sx={{
                    bgcolor: alpha(getRelevanceColor(file.relevance_percent), 0.1),
                    color: getRelevanceColor(file.relevance_percent),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
              </Box>
            ))}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default FileRelevanceDisplay;
