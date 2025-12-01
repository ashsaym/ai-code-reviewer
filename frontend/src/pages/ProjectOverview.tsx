import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as BackIcon,
  Chat as ChatIcon,
  Source as SourceIcon,
  Work as JobsIcon,
  Storage as StorageIcon,
  Description as FileIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Project } from '../types';
import { getProject } from '../services/api';
import { LoadingSpinner, ActionCard, StatCard } from '../components/common';

const ProjectOverview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      const response = await getProject(id);
      setProject(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  if (loading) return <LoadingSpinner fullScreen message="Loading project..." />;
  if (!project) return <Alert severity="error">Project not found</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/projects')}>Back</Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}

      {/* Project Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, fontSize: '1.5rem' }}>
              {project.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" fontWeight="bold">{project.name}</Typography>
              <Typography color="text.secondary">{project.description || 'No description'}</Typography>
            </Box>
            <Button startIcon={<EditIcon />} variant="outlined" onClick={() => navigate('/projects')}>Edit</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Sources" value={project.source_count || 0} icon={<SourceIcon />} color="#2563eb" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Files" value={project.total_files || 0} icon={<FileIcon />} color="#7c3aed" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Chunks" value={project.total_chunks || 0} icon={<StorageIcon />} color="#10b981" />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" gutterBottom>Quick Actions</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <ActionCard
            icon={<ChatIcon />}
            iconColor="#10b981"
            title="Start Chat"
            description="Chat with this project"
            onClick={() => navigate(`/chat/${project.id}`)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <ActionCard
            icon={<SourceIcon />}
            iconColor="#2563eb"
            title="Manage Sources"
            description="Add or configure sources"
            onClick={() => navigate(`/projects/${project.id}/sources`)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <ActionCard
            icon={<JobsIcon />}
            iconColor="#7c3aed"
            title="View Jobs"
            description="Check processing jobs"
            onClick={() => navigate('/jobs')}
          />
        </Grid>
      </Grid>

      {/* Info */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Project Information</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Project ID</Typography>
              <Typography fontFamily="monospace" fontSize="0.875rem">{project.id}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Milvus Collection</Typography>
              <Typography fontFamily="monospace" fontSize="0.875rem">{project.milvus_collection || 'Not created'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Created</Typography>
              <Typography>{new Date(project.created_at).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Updated</Typography>
              <Typography>{new Date(project.updated_at).toLocaleString()}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProjectOverview;
