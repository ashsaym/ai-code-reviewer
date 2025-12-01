import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as QueuedIcon,
  HourglassEmpty as ProcessingIcon,
  Cancel as CancelledIcon,
  PauseCircle as PausedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'queued' | 'processing' | 'paused' | 'cancelled' | 'completed' | 'failed' | 'pending';

interface StatusChipProps {
  status: StatusType | string;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}

const getStatusConfig = (status: string): { color: ChipProps['color']; icon: React.ReactElement | null } => {
  if (!status) {
    return { color: 'default', icon: null };
  }
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'completed':
    case 'success':
    case 'healthy':
      return { color: 'success', icon: <SuccessIcon fontSize="small" /> };
    case 'failed':
    case 'error':
    case 'unhealthy':
      return { color: 'error', icon: <ErrorIcon fontSize="small" /> };
    case 'warning':
    case 'degraded':
      return { color: 'warning', icon: <WarningIcon fontSize="small" /> };
    case 'processing':
    case 'running':
      return { color: 'info', icon: <ProcessingIcon fontSize="small" /> };
    case 'paused':
      return { color: 'warning', icon: <PausedIcon fontSize="small" /> };
    case 'cancelled':
      return { color: 'default', icon: <CancelledIcon fontSize="small" /> };
    case 'queued':
    case 'pending':
      return { color: 'default', icon: <QueuedIcon fontSize="small" /> };
    default:
      return { color: 'default', icon: null };
  }
};

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small', showIcon = true }) => {
  const { color, icon } = getStatusConfig(status);
  
  return (
    <Chip
      icon={showIcon ? icon || undefined : undefined}
      label={status}
      size={size}
      color={color}
    />
  );
};

export default StatusChip;
