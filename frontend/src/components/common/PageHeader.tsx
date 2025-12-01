import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  actions,
}) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
    <Box sx={{ display: 'flex', gap: 2 }}>
      {onRefresh && (
        <Button startIcon={<RefreshIcon />} onClick={onRefresh} variant="outlined">
          Refresh
        </Button>
      )}
      {actions}
    </Box>
  </Box>
);

export default PageHeader;
