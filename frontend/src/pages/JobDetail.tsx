import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Paper,
  LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Replay as RestartIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Job } from '../types';
import { getJob, pauseJob, resumeJob, cancelJob, restartJob, deleteJob } from '../services/api';
import { LoadingSpinner, StatusChip } from '../components/common';

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const JobDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const response = await getJob(jobId);
      // Backend returns { job: Job, logs: [...] }, extract the job object
      const jobData = (response.data as any).job || response.data;
      setJob(jobData);
      setError(null);
    } catch (err: any) {
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
    const interval = setInterval(loadJob, 3000);
    return () => clearInterval(interval);
  }, [loadJob]);

  const handleAction = async (action: string) => {
    if (!job) return;
    try {
      switch (action) {
        case 'pause': await pauseJob(job.id); break;
        case 'resume': await resumeJob(job.id); break;
        case 'cancel': await cancelJob(job.id); break;
        case 'restart': await restartJob(job.id); break;
        case 'delete':
          if (window.confirm('Delete this job?')) {
            await deleteJob(job.id);
            navigate('/jobs');
            return;
          }
          break;
      }
      loadJob();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${action} job`);
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading job details..." />;
  if (!job) return <Alert severity="error">Job not found</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/jobs')}>Back</Button>
        <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1 }}>Job Details</Typography>
        <Button startIcon={<RefreshIcon />} onClick={loadJob} variant="outlined">Refresh</Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}

      {/* Status and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">{job.job_type}</Typography>
              <StatusChip status={job.status} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {job.status === 'processing' && (
                <Button startIcon={<PauseIcon />} onClick={() => handleAction('pause')} variant="outlined">
                  Pause
                </Button>
              )}
              {job.status === 'paused' && (
                <Button startIcon={<PlayIcon />} onClick={() => handleAction('resume')} variant="contained">
                  Resume
                </Button>
              )}
              {['processing', 'queued', 'paused'].includes(job.status) && (
                <Button startIcon={<StopIcon />} onClick={() => handleAction('cancel')} color="warning" variant="outlined">
                  Cancel
                </Button>
              )}
              {['failed', 'cancelled'].includes(job.status) && (
                <Button startIcon={<RestartIcon />} onClick={() => handleAction('restart')} variant="contained">
                  Restart
                </Button>
              )}
              {['completed', 'failed', 'cancelled'].includes(job.status) && (
                <Button startIcon={<DeleteIcon />} onClick={() => handleAction('delete')} color="error" variant="outlined">
                  Delete
                </Button>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Progress: {Math.round(job.progress_percent || 0)}%</Typography>
              <Typography variant="body2">{job.processed_items || 0} / {job.total_items || 0} items</Typography>
            </Box>
            <LinearProgress variant="determinate" value={job.progress_percent || 0} sx={{ height: 10, borderRadius: 1 }} />
          </Box>
        </CardContent>
      </Card>

      {/* Details */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Job Information</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Job ID</Typography>
                  <Typography fontFamily="monospace" fontSize="0.875rem">{job.id}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Type</Typography>
                  <Typography>{job.job_type}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Duration</Typography>
                  <Typography>{formatDuration(job.duration_seconds)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Started</Typography>
                  <Typography>{job.started_at ? new Date(job.started_at).toLocaleString() : '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Completed</Typography>
                  <Typography>{job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Progress Details</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Total Items</Typography>
                  <Typography>{job.total_items || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Processed</Typography>
                  <Typography>{job.processed_items || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Failed</Typography>
                  <Typography color="error.main">{job.failed_items || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Current Item</Typography>
                  <Typography noWrap sx={{ maxWidth: 200 }}>{job.current_item || '-'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {job.error_message && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="error">{job.error_message}</Alert>
          </Grid>
        )}

        {job.result && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Result</Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {JSON.stringify(job.result, null, 2)}
                  </pre>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default JobDetail;
