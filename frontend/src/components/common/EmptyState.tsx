import React from 'react';
import { Paper, Typography, Button, Box } from '@mui/material';

interface EmptyStateProps {
  icon: React.ReactElement;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <Paper sx={{ p: 6, textAlign: 'center' }}>
    <Box sx={{ color: 'text.secondary', mb: 2, '& svg': { fontSize: 64 } }}>
      {icon}
    </Box>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    {description && (
      <Typography color="text.secondary" sx={{ mb: actionLabel ? 3 : 0 }}>
        {description}
      </Typography>
    )}
    {actionLabel && onAction && (
      <Button variant="contained" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </Paper>
);

export default EmptyState;
