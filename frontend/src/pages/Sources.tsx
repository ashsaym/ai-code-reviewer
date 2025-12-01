import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Paper,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  Source as SourceIcon,
  PlayArrow as ProcessIcon,
  Memory as EmbedIcon,
  Refresh as RefreshIcon,
  CleaningServices as CleanIcon,
  Architecture as FullIngestIcon,
  DeleteSweep as DeleteVectorsIcon,
  FolderOff as ExcludeIcon,
  Work as JobIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Replay as RestartIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { Source, Project, Job } from '../types';
import { 
  getSources, 
  createSource, 
  deleteSource, 
  getProject, 
  createJob, 
  updateSource,
  reSyncSource,
  reProcessSource,
  reEmbedSource,
  getJobs,
  pauseJob,
  resumeJob,
  cancelJob,
  restartJob,
  deleteJob,
} from '../services/api';
import { LoadingSpinner, EmptyState, StatusChip, ConfirmDialog } from '../components/common';

const Sources: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    repo_url: '', 
    branch: 'main',
    include_patterns: '',
    exclude_patterns: '',
    exclude_folders: '',
  });

  // Job creation loading
  const [jobCreating, setJobCreating] = useState<string | null>(null);

  // Jobs state
  const [sourceJobs, setSourceJobs] = useState<Record<string, Job[]>>({});

  const loadSourceJobs = useCallback(async (sourceId: string) => {
    try {
      const response = await getJobs({ source_id: sourceId, limit: 50 });
      const jobs = response.data.jobs || [];
      console.log(`[Sources] Loaded ${jobs.length} jobs for source ${sourceId}:`, jobs.map(j => `${j.job_type}:${j.status}`));
      setSourceJobs(prev => ({ ...prev, [sourceId]: jobs }));
    } catch (err: any) {
      console.error('Failed to load jobs for source:', sourceId, err);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projectRes, sourcesRes] = await Promise.all([
        getProject(projectId),
        getSources(projectId),
      ]);
      setProject(projectRes.data);
      const loadedSources = sourcesRes.data.sources || [];
      setSources(loadedSources);
      
      // Load jobs for all sources immediately
      loadedSources.forEach(source => {
        loadSourceJobs(source.id);
      });
      
      setError(null);
    } catch (err: any) {
      setError('Failed to load sources');
    } finally {
      setLoading(false);
    }
  }, [projectId, loadSourceJobs]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh jobs for all sources every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      sources.forEach(source => {
        loadSourceJobs(source.id);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [sources, loadSourceJobs]);

  const handleCreate = async () => {
    if (!projectId || !formData.name || !formData.repo_url) return;
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        repo_url: formData.repo_url,
        branch: formData.branch,
        include_patterns: formData.include_patterns.split(',').map(s => s.trim()).filter(Boolean),
        exclude_patterns: formData.exclude_patterns.split(',').map(s => s.trim()).filter(Boolean),
        exclude_folders: formData.exclude_folders.split(',').map(s => s.trim()).filter(Boolean),
      };
      await createSource(projectId, payload);
      setFormOpen(false);
      setFormData({ 
        name: '', 
        repo_url: '', 
        branch: 'main',
        include_patterns: '',
        exclude_patterns: '',
        exclude_folders: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create source');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSource) return;
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        repo_url: formData.repo_url,
        branch: formData.branch,
        include_patterns: formData.include_patterns.split(',').map(s => s.trim()).filter(Boolean),
        exclude_patterns: formData.exclude_patterns.split(',').map(s => s.trim()).filter(Boolean),
        exclude_folders: formData.exclude_folders.split(',').map(s => s.trim()).filter(Boolean),
      };
      await updateSource(selectedSource.id, payload);
      setEditOpen(false);
      setSelectedSource(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update source');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSource) return;
    try {
      setSaving(true);
      await deleteSource(selectedSource.id);
      setDeleteOpen(false);
      setSelectedSource(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete source');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (source: Source) => {
    setSelectedSource(source);
    setFormData({
      name: source.name,
      repo_url: source.repo_url || '',
      branch: source.branch || 'main',
      include_patterns: (source.include_patterns || []).join(', '),
      exclude_patterns: (source.exclude_patterns || []).join(', '),
      exclude_folders: (source.exclude_folders || []).join(', '),
    });
    setEditOpen(true);
  };

  const handleJobActionOld = async (source: Source, jobType: string, prepAction?: () => Promise<void>) => {
    try {
      setJobCreating(jobType);
      if (prepAction) {
        await prepAction();
      }
      const newJob = await createJob({ 
        job_type: jobType, 
        project_id: projectId,
        source_id: source.id 
      });
      
      // Immediately add the new job to the list
      setSourceJobs(prev => ({
        ...prev,
        [source.id]: [newJob.data, ...(prev[source.id] || [])]
      }));
      
      setError(null);
      setJobCreating(null);
      
      // Refresh after a short delay to get updated status
      setTimeout(() => {
        loadSourceJobs(source.id);
        loadData();
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to start ${jobType} job`);
      setJobCreating(null);
    }
  };

  const handleSync = async (source: Source) => {
    await handleJobActionOld(source, 'sync');
  };

  const handleProcess = async (source: Source) => {
    await handleJobActionOld(source, 'process');
  };

  const handleEmbed = async (source: Source) => {
    await handleJobActionOld(source, 'embed');
  };

  const handleFullIngest = async (source: Source) => {
    await handleJobActionOld(source, 'full_ingest');
  };

  const handleReprocess = async (source: Source) => {
    await handleJobActionOld(source, 'reprocess', async () => {
      await reProcessSource(source.id);
    });
  };

  const handleDeleteVectors = async (source: Source) => {
    await handleJobActionOld(source, 'delete_vectors', async () => {
      await reEmbedSource(source.id);
    });
  };

  const handleReSync = async (source: Source) => {
    try {
      setJobCreating('re-sync');
      await reSyncSource(source.id);
      await createJob({ 
        job_type: 'sync', 
        project_id: projectId,
        source_id: source.id 
      });
      setTimeout(() => {
        setJobCreating(null);
        loadData();
        loadSourceJobs(source.id);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to re-sync source');
      setJobCreating(null);
    }
  };

  const handleJobAction = async (action: string, job: Job, sourceId: string) => {
    try {
      switch (action) {
        case 'pause': 
          await pauseJob(job.id);
          break;
        case 'resume': 
          await resumeJob(job.id);
          break;
        case 'cancel': 
          await cancelJob(job.id);
          break;
        case 'restart': 
          const newJob = await restartJob(job.id);
          // Add the restarted job to the list immediately
          setSourceJobs(prev => ({
            ...prev,
            [sourceId]: [newJob.data, ...(prev[sourceId] || []).filter(j => j.id !== job.id)]
          }));
          break;
        case 'delete':
          if (!window.confirm('Delete this job?')) return;
          await deleteJob(job.id);
          // Remove from list immediately
          setSourceJobs(prev => ({
            ...prev,
            [sourceId]: (prev[sourceId] || []).filter(j => j.id !== job.id)
          }));
          break;
      }
      // Refresh to get updated status
      setTimeout(() => loadSourceJobs(sourceId), 300);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${action} job`);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getActiveJobs = (sourceId: string): Job[] => {
    const jobs = sourceJobs[sourceId] || [];
    const active = jobs.filter(j => ['processing', 'running', 'queued', 'paused'].includes(j.status));
    console.log(`[Sources] Active jobs for ${sourceId}:`, active.length, active);
    return active;
  };

  const getCompletedJobs = (sourceId: string): Job[] => {
    const jobs = sourceJobs[sourceId] || [];
    const completed = jobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status));
    console.log(`[Sources] Completed jobs for ${sourceId}:`, completed.length);
    return completed;
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading sources..." />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/projects')}>Back</Button>
        <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1 }}>
          {project?.name} - Sources
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { 
          setFormData({ 
            name: '', 
            repo_url: '', 
            branch: 'main',
            include_patterns: '',
            exclude_patterns: '',
            exclude_folders: '',
          }); 
          setFormOpen(true); 
        }}>
          Add Source
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
      {jobCreating && <Alert severity="info" sx={{ mb: 3 }}>Creating {jobCreating} job...</Alert>}

      {sources.length === 0 ? (
        <EmptyState icon={<SourceIcon />} title="No sources yet" description="Add a GitHub repository as a source" actionLabel="Add Source" onAction={() => setFormOpen(true)} />
      ) : (
        <Box>
          {sources.map((source) => {
            const activeJobs = getActiveJobs(source.id);
            const completedJobs = getCompletedJobs(source.id);
            
            return (
              <Paper key={source.id} sx={{ mb: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>{source.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {source.repo_url} ({source.branch})
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <StatusChip status={source.status || 'pending'} />
                        <Chip label={`${source.total_files || 0} files`} size="small" variant="outlined" />
                        <Chip label={`${source.processed_files || 0} processed`} size="small" variant="outlined" />
                        <Chip label={`${source.total_chunks || 0} chunks`} size="small" variant="outlined" />
                        {activeJobs.length > 0 && (
                          <Chip 
                            icon={<JobIcon />}
                            label={`${activeJobs.length} active job${activeJobs.length > 1 ? 's' : ''}`} 
                            size="small" 
                            color="info"
                          />
                        )}
                        {source.last_sync_at && (
                          <Typography variant="caption" color="text.secondary">
                            Last synced: {new Date(source.last_sync_at).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                      {(source.exclude_folders && source.exclude_folders.length > 0) && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            <ExcludeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            Excluded folders: {source.exclude_folders.join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center' }}>
                      {/* Primary Actions */}
                      <Tooltip title="Full Ingest - Complete pipeline: sync files from GitHub, process them into chunks, and generate embeddings">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleFullIngest(source)}
                          disabled={!!jobCreating}
                          sx={{ border: '2px solid', borderColor: 'primary.main', '&:hover': { bgcolor: 'primary.light' } }}
                        >
                          <FullIngestIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Sync - Fetch and update files from GitHub repository">
                        <IconButton
                          size="small"
                          onClick={() => handleSync(source)}
                          disabled={!!jobCreating}
                        >
                          <SyncIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Process - Parse files and split into searchable text chunks">
                        <IconButton
                          size="small"
                          onClick={() => handleProcess(source)}
                          disabled={!!jobCreating}
                        >
                          <ProcessIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Embed - Generate vector embeddings for semantic search">
                        <IconButton
                          size="small"
                          onClick={() => handleEmbed(source)}
                          disabled={!!jobCreating}
                        >
                          <EmbedIcon />
                        </IconButton>
                      </Tooltip>

                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                      {/* Advanced Actions */}
                      <Tooltip title="Re-Sync - Clear all local files and fetch fresh from GitHub">
                        <IconButton
                          size="small"
                          onClick={() => handleReSync(source)}
                          disabled={!!jobCreating}
                          color="warning"
                        >
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Re-Process - Delete existing chunks and re-process all files">
                        <IconButton
                          size="small"
                          onClick={() => handleReprocess(source)}
                          disabled={!!jobCreating}
                          color="warning"
                        >
                          <CleanIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete Vectors - Remove all embeddings and re-generate from scratch">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteVectors(source)}
                          disabled={!!jobCreating}
                          color="warning"
                        >
                          <DeleteVectorsIcon />
                        </IconButton>
                      </Tooltip>

                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                      {/* Source Management */}
                      <Tooltip title="Edit Source - Modify repository URL, branch, or file filters">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(source)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete Source - Permanently remove this source and all its data">
                        <IconButton
                          size="small"
                          onClick={() => { setSelectedSource(source); setDeleteOpen(true); }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                </Box>

                {/* Jobs Section - Always Show */}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ px: 2, pb: 2 }}>
                    
                    {/* Active Jobs */}
                    {activeJobs.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <JobIcon fontSize="small" /> Active Jobs
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Progress</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {activeJobs.map((job) => (
                              <TableRow key={job.id} hover>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>{job.job_type}</Typography>
                                  <Typography variant="caption" color="text.secondary">{job.id.slice(0, 8)}...</Typography>
                                </TableCell>
                                <TableCell><StatusChip status={job.status} size="small" /></TableCell>
                                <TableCell sx={{ minWidth: 150 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={job.progress_percent || 0}
                                      sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                                    />
                                    <Typography variant="caption">{Math.round(job.progress_percent || 0)}%</Typography>
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {job.processed_items || 0} / {job.total_items || 0}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{formatDuration(job.duration_seconds)}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                    {['processing', 'running'].includes(job.status) && (
                                      <IconButton size="small" onClick={() => handleJobAction('pause', job, source.id)} title="Pause">
                                        <PauseIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                    {job.status === 'paused' && (
                                      <IconButton size="small" onClick={() => handleJobAction('resume', job, source.id)} title="Resume">
                                        <ProcessIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                    {['processing', 'running', 'queued', 'paused'].includes(job.status) && (
                                      <IconButton size="small" onClick={() => handleJobAction('cancel', job, source.id)} title="Cancel" color="warning">
                                        <StopIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    )}

                    {/* Completed Jobs History */}
                    {completedJobs.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <HistoryIcon fontSize="small" /> Recent History
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Completed</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell>Items</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {completedJobs.slice(0, 10).map((job) => (
                              <TableRow key={job.id} hover>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>{job.job_type}</Typography>
                                  <Typography variant="caption" color="text.secondary">{job.id.slice(0, 8)}...</Typography>
                                </TableCell>
                                <TableCell><StatusChip status={job.status} size="small" /></TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{formatDuration(job.duration_seconds)}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {job.processed_items || 0} / {job.total_items || 0}
                                    {(job.failed_items || 0) > 0 && <span style={{ color: '#ef4444' }}> ({job.failed_items} failed)</span>}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                    {['failed', 'cancelled'].includes(job.status) && (
                                      <IconButton size="small" onClick={() => handleJobAction('restart', job, source.id)} title="Restart">
                                        <RestartIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                    <IconButton size="small" onClick={() => handleJobAction('delete', job, source.id)} title="Delete" color="error">
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    )}

                    {/* Show message if no jobs */}
                    {activeJobs.length === 0 && completedJobs.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No jobs yet. Click Sync, Process, or Embed to start a job.
                      </Typography>
                    )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Add Source Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Source</DialogTitle>
        <DialogContent>
          <TextField 
            fullWidth 
            label="Source Name" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            sx={{ mt: 2, mb: 2 }} 
            required 
          />
          <TextField 
            fullWidth 
            label="Repository URL" 
            value={formData.repo_url} 
            onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })} 
            sx={{ mb: 2 }} 
            required 
            helperText="e.g., https://github.com/owner/repo" 
          />
          <TextField 
            fullWidth 
            label="Branch" 
            value={formData.branch} 
            onChange={(e) => setFormData({ ...formData, branch: e.target.value })} 
            sx={{ mb: 2 }}
            helperText="Default: main" 
          />
          <TextField
            fullWidth
            label="Exclude Folders"
            value={formData.exclude_folders}
            onChange={(e) => setFormData({ ...formData, exclude_folders: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Comma-separated folder paths to exclude (e.g., node_modules, dist, .git)"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Exclude Patterns"
            value={formData.exclude_patterns}
            onChange={(e) => setFormData({ ...formData, exclude_patterns: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Comma-separated file patterns to exclude (e.g., *.log, *.tmp, test_*)"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Include Patterns"
            value={formData.include_patterns}
            onChange={(e) => setFormData({ ...formData, include_patterns: e.target.value })}
            helperText="Comma-separated file patterns to include (e.g., *.py, *.ts, *.md). Leave empty for all."
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!formData.name || !formData.repo_url || saving}>
            {saving ? <CircularProgress size={20} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Source Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Source</DialogTitle>
        <DialogContent>
          <TextField 
            fullWidth 
            label="Source Name" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            sx={{ mt: 2, mb: 2 }} 
            required 
          />
          <TextField 
            fullWidth 
            label="Repository URL" 
            value={formData.repo_url} 
            onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })} 
            sx={{ mb: 2 }} 
            required 
            helperText="e.g., https://github.com/owner/repo" 
          />
          <TextField 
            fullWidth 
            label="Branch" 
            value={formData.branch} 
            onChange={(e) => setFormData({ ...formData, branch: e.target.value })} 
            sx={{ mb: 2 }}
            helperText="Default: main" 
          />
          <TextField
            fullWidth
            label="Exclude Folders"
            value={formData.exclude_folders}
            onChange={(e) => setFormData({ ...formData, exclude_folders: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Comma-separated folder paths to exclude (e.g., node_modules, dist, .git)"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Exclude Patterns"
            value={formData.exclude_patterns}
            onChange={(e) => setFormData({ ...formData, exclude_patterns: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Comma-separated file patterns to exclude (e.g., *.log, *.tmp, test_*)"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Include Patterns"
            value={formData.include_patterns}
            onChange={(e) => setFormData({ ...formData, include_patterns: e.target.value })}
            helperText="Comma-separated file patterns to include (e.g., *.py, *.ts, *.md). Leave empty for all."
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleEdit} variant="contained" disabled={!formData.name || !formData.repo_url || saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog open={deleteOpen} title="Delete Source" message={<Typography>Delete source <strong>{selectedSource?.name}</strong>?</Typography>} confirmLabel="Delete" confirmColor="error" loading={saving} onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </Box>
  );
};

export default Sources;
