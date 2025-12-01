import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  Alert,
  alpha,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Replay as RestartIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  HourglassEmpty as ProcessingIcon,
} from '@mui/icons-material';
import { Job } from '../types';
import { getJobs, pauseJob, resumeJob, cancelJob, restartJob, deleteJob } from '../services/api';
import { LoadingSpinner, PageHeader, StatusChip, EmptyState } from '../components/common';

// Utility functions
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

// Stats component
interface JobStatsProps {
  jobs: Job[];
}

const JobStats: React.FC<JobStatsProps> = ({ jobs }) => {
  const stats = {
    total: jobs.length,
    processing: jobs.filter(j => j.status === 'processing').length,
    queued: jobs.filter(j => j.status === 'queued').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  const items = [
    { label: 'Total', value: stats.total, color: 'text.primary', bg: 'transparent' },
    { label: 'Processing', value: stats.processing, color: 'info.main', bg: alpha('#3b82f6', 0.1) },
    { label: 'Queued', value: stats.queued, color: 'text.secondary', bg: alpha('#64748b', 0.1) },
    { label: 'Completed', value: stats.completed, color: 'success.main', bg: alpha('#10b981', 0.1) },
    { label: 'Failed', value: stats.failed, color: 'error.main', bg: alpha('#ef4444', 0.1) },
  ];

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
      {items.map((item) => (
        <Card key={item.label} sx={{ minWidth: 120, flex: 1, bgcolor: item.bg }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color={item.color}>{item.label}</Typography>
            <Typography variant="h4" fontWeight="bold" color={item.color}>{item.value}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

// Job row component
interface JobRowProps {
  job: Job;
  onAction: (action: string, job: Job) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, job: Job) => void;
  onClick: (job: Job) => void;
}

const JobRow: React.FC<JobRowProps> = ({ job, onAction, onMenuOpen, onClick }) => (
  <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => onClick(job)}>
    <TableCell>
      <Typography variant="body2" fontWeight={600}>{job.job_type}</Typography>
      <Typography variant="caption" color="text.secondary">{job.id.slice(0, 8)}...</Typography>
    </TableCell>
    <TableCell>
      <StatusChip status={job.status} />
    </TableCell>
    <TableCell sx={{ minWidth: 200 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <LinearProgress
            variant="determinate"
            value={job.progress_percent || 0}
            color={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
        <Typography variant="body2" sx={{ minWidth: 40 }}>{Math.round(job.progress_percent || 0)}%</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {job.processed_items || 0} / {job.total_items || 0} items
      </Typography>
    </TableCell>
    <TableCell>
      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{job.current_item || '-'}</Typography>
    </TableCell>
    <TableCell>{formatDuration(job.duration_seconds)}</TableCell>
    <TableCell>
      <Typography variant="body2">{job.started_at ? new Date(job.started_at).toLocaleString() : '-'}</Typography>
    </TableCell>
    <TableCell align="right">
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        {job.status === 'processing' && (
          <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); onAction('pause', job); }}
            title="Pause"
          >
            <PauseIcon fontSize="small" />
          </IconButton>
        )}
        {job.status === 'paused' && (
          <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); onAction('resume', job); }}
            title="Resume"
          >
            <PlayIcon fontSize="small" />
          </IconButton>
        )}
        {['processing', 'queued', 'paused'].includes(job.status) && (
          <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); onAction('cancel', job); }}
            title="Cancel"
            color="warning"
          >
            <StopIcon fontSize="small" />
          </IconButton>
        )}
        {['failed', 'cancelled'].includes(job.status) && (
          <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); onAction('restart', job); }}
            title="Restart"
            color="primary"
          >
            <RestartIcon fontSize="small" />
          </IconButton>
        )}
        {['completed', 'failed', 'cancelled'].includes(job.status) && (
          <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); onAction('delete', job); }}
            title="Delete"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMenuOpen(e, job); }} title="More options">
          <MoreIcon />
        </IconButton>
      </Box>
    </TableCell>
  </TableRow>
);

const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuJob, setMenuJob] = useState<Job | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await getJobs(params);
      setJobs(response.data.jobs || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const handleAction = async (action: string, job: Job) => {
    try {
      switch (action) {
        case 'pause': await pauseJob(job.id); break;
        case 'resume': await resumeJob(job.id); break;
        case 'cancel': await cancelJob(job.id); break;
        case 'restart': await restartJob(job.id); break;
        case 'delete':
          if (window.confirm('Delete this job?')) await deleteJob(job.id);
          break;
      }
      loadJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${action} job`);
    }
    setMenuAnchor(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, job: Job) => {
    setMenuAnchor(event.currentTarget);
    setMenuJob(job);
  };

  if (loading && jobs.length === 0) {
    return <LoadingSpinner fullScreen message="Loading jobs..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader title="Jobs" subtitle="Monitor and manage processing jobs" onRefresh={loadJobs} />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}

      <JobStats jobs={jobs} />

      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status Filter">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="queued">Queued</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="paused">Paused</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {jobs.length === 0 ? (
        <EmptyState
          icon={<ProcessingIcon />}
          title="No jobs found"
          description="Jobs will appear here when you start processing sources"
        />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Current Item</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Started</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onAction={handleAction}
                  onMenuOpen={handleMenuOpen}
                  onClick={(j) => navigate(`/jobs/${j.id}`)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => menuJob && navigate(`/jobs/${menuJob.id}`)}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        {menuJob?.status === 'processing' && (
          <MenuItem onClick={() => menuJob && handleAction('pause', menuJob)}>
            <ListItemIcon><PauseIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Pause</ListItemText>
          </MenuItem>
        )}
        {menuJob?.status === 'paused' && (
          <MenuItem onClick={() => menuJob && handleAction('resume', menuJob)}>
            <ListItemIcon><PlayIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Resume</ListItemText>
          </MenuItem>
        )}
        {['processing', 'queued', 'paused'].includes(menuJob?.status || '') && (
          <MenuItem onClick={() => menuJob && handleAction('cancel', menuJob)}>
            <ListItemIcon><StopIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Cancel</ListItemText>
          </MenuItem>
        )}
        {['failed', 'cancelled'].includes(menuJob?.status || '') && (
          <MenuItem onClick={() => menuJob && handleAction('restart', menuJob)}>
            <ListItemIcon><RestartIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Restart</ListItemText>
          </MenuItem>
        )}
        {['completed', 'failed', 'cancelled'].includes(menuJob?.status || '') && (
          <MenuItem onClick={() => menuJob && handleAction('delete', menuJob)} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default Jobs;
