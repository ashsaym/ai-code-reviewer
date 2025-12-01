import React from 'react';
import { Paper, Box, Typography, alpha } from '@mui/material';
import { ArrowForward as ArrowIcon } from '@mui/icons-material';

interface ActionCardProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  iconColor,
  title,
  description,
  onClick,
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        bgcolor: 'action.hover',
        borderColor: 'primary.main',
      },
    }}
    onClick={onClick}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(iconColor, 0.1),
          color: iconColor,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography fontWeight={600}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <ArrowIcon color="action" />
    </Box>
  </Paper>
);

export default ActionCard;
