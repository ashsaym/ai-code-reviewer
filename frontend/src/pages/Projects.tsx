import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Alert,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  Folder as FolderIcon,
  Source as SourceIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Description as FileIcon,
} from '@mui/icons-material';
import { Project, GitHubConfig, OpenWebUIConfig } from '../types';
import { getProjects, createProject, updateProject, deleteProject, resetProject, getGitHubConfigs, getOpenWebUIConfigs } from '../services/api';
import { LoadingSpinner, PageHeader, EmptyState, FormDialog, ConfirmDialog } from '../components/common';

// Project card component
interface ProjectCardProps {
  project: Project;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, project: Project) => void;
  onClick: () => void;
  onChat: () => void;
  onSources: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onMenuOpen, onClick, onChat, onSources }) => (
  <Card
    sx={{
      height: '100%',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
    }}
    onClick={onClick}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
            {project.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold" noWrap>{project.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              Created {new Date(project.created_at).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMenuOpen(e, project); }}>
          <MoreIcon />
        </IconButton>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2, minHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
      >
        {project.description || 'No description'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip icon={<SourceIcon sx={{ fontSize: '16px !important' }} />} label={`${project.source_count || 0} sources`} size="small" sx={{ bgcolor: alpha('#2563eb', 0.1) }} />
        <Chip icon={<FileIcon sx={{ fontSize: '16px !important' }} />} label={`${project.total_files || 0} files`} size="small" sx={{ bgcolor: alpha('#7c3aed', 0.1) }} />
        <Chip icon={<StorageIcon sx={{ fontSize: '16px !important' }} />} label={`${project.total_chunks || 0} chunks`} size="small" sx={{ bgcolor: alpha('#10b981', 0.1) }} />
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="Chat with project">
          <Button size="small" startIcon={<ChatIcon />} onClick={(e) => { e.stopPropagation(); onChat(); }}>Chat</Button>
        </Tooltip>
        <Tooltip title="View sources">
          <Button size="small" startIcon={<SourceIcon />} onClick={(e) => { e.stopPropagation(); onSources(); }}>Sources</Button>
        </Tooltip>
      </Box>
    </CardContent>
  </Card>
);

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Configuration options
  const [githubConfigs, setGithubConfigs] = useState<GitHubConfig[]>([]);
  const [openWebUIConfigs, setOpenWebUIConfigs] = useState<OpenWebUIConfig[]>([]);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({ name: '', description: '', github_config_id: '', openwebui_config_id: '' });

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getProjects();
      setProjects(response.data.projects || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfigs = useCallback(async () => {
    try {
      const [ghResponse, owResponse] = await Promise.all([
        getGitHubConfigs(),
        getOpenWebUIConfigs()
      ]);
      setGithubConfigs(ghResponse.data.configs || []);
      setOpenWebUIConfigs(owResponse.data.configs || []);
    } catch (err: any) {
      console.error('Failed to load configs:', err);
    }
  }, []);

  useEffect(() => { 
    loadProjects(); 
    loadConfigs();
  }, [loadProjects, loadConfigs]);

  const handleCreate = async () => {
    if (!formData.name?.trim()) return;
    try {
      setSaving(true);
      await createProject({ 
        name: formData.name, 
        description: formData.description || undefined,
        github_config_id: formData.github_config_id || undefined,
        openwebui_config_id: formData.openwebui_config_id || undefined
      });
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', github_config_id: '', openwebui_config_id: '' });
      loadProjects();
      window.dispatchEvent(new CustomEvent('projectsUpdated'));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProject || !formData.name?.trim()) return;
    try {
      setSaving(true);
      await updateProject(selectedProject.id, { 
        name: formData.name, 
        description: formData.description || undefined,
        github_config_id: formData.github_config_id || undefined,
        openwebui_config_id: formData.openwebui_config_id || undefined
      });
      setEditDialogOpen(false);
      setSelectedProject(null);
      setFormData({ name: '', description: '', github_config_id: '', openwebui_config_id: '' });
      loadProjects();
      window.dispatchEvent(new CustomEvent('projectsUpdated'));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      setSaving(true);
      await deleteProject(selectedProject.id);
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      loadProjects();
      window.dispatchEvent(new CustomEvent('projectsUpdated'));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete project');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (project: Project) => {
    if (!window.confirm(`Reset project "${project.name}"? This will clear all embeddings.`)) return;
    try {
      await resetProject(project.id);
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset project');
    }
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setFormData({ 
      name: project.name, 
      description: project.description || '',
      github_config_id: project.github_config_id || '',
      openwebui_config_id: project.openwebui_config_id || ''
    });
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const openDeleteDialog = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading projects..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Projects"
        subtitle="Manage your codebase projects and sources"
        onRefresh={loadProjects}
        actions={
          <Button startIcon={<AddIcon />} onClick={() => { setFormData({ name: '', description: '', github_config_id: '', openwebui_config_id: '' }); setCreateDialogOpen(true); }} variant="contained">
            New Project
          </Button>
        }
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderIcon />}
          title="No projects yet"
          description="Create your first project to get started"
          actionLabel="Create Project"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
              <ProjectCard
                project={project}
                onMenuOpen={(e, p) => { setMenuAnchor(e.currentTarget); setMenuProject(p); }}
                onClick={() => navigate(`/projects/${project.id}`)}
                onChat={() => navigate(`/chat/${project.id}`)}
                onSources={() => navigate(`/projects/${project.id}/sources`)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => menuProject && openEditDialog(menuProject)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { menuProject && handleReset(menuProject); setMenuAnchor(null); }}>
          <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Reset Embeddings</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuProject && openDeleteDialog(menuProject)} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <FormDialog
        open={createDialogOpen}
        title="Create New Project"
        fields={[
          { name: 'name', label: 'Project Name', required: true },
          { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
          { 
            name: 'github_config_id', 
            label: 'GitHub Configuration', 
            type: 'select',
            options: [
              { value: '', label: 'Use Default' },
              ...githubConfigs.filter(c => c.is_active).map(c => ({ value: c.id, label: c.name }))
            ],
            helperText: 'Select which GitHub host to use for this project'
          },
          { 
            name: 'openwebui_config_id', 
            label: 'OpenWebUI Configuration', 
            type: 'select',
            options: [
              { value: '', label: 'Use Default' },
              ...openWebUIConfigs.filter(c => c.is_active).map(c => ({ value: c.id, label: c.name }))
            ],
            helperText: 'Select which OpenWebUI instance to use for chat and embeddings'
          },
        ]}
        values={formData}
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
        submitLabel="Create"
        loading={saving}
        onSubmit={handleCreate}
        onCancel={() => setCreateDialogOpen(false)}
      />

      {/* Edit Dialog */}
      <FormDialog
        open={editDialogOpen}
        title="Edit Project"
        fields={[
          { name: 'name', label: 'Project Name', required: true },
          { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
          { 
            name: 'github_config_id', 
            label: 'GitHub Configuration', 
            type: 'select',
            options: [
              { value: '', label: 'Use Default' },
              ...githubConfigs.filter(c => c.is_active).map(c => ({ value: c.id, label: c.name }))
            ],
            helperText: 'Select which GitHub host to use for this project'
          },
          { 
            name: 'openwebui_config_id', 
            label: 'OpenWebUI Configuration', 
            type: 'select',
            options: [
              { value: '', label: 'Use Default' },
              ...openWebUIConfigs.filter(c => c.is_active).map(c => ({ value: c.id, label: c.name }))
            ],
            helperText: 'Select which OpenWebUI instance to use for chat and embeddings'
          },
        ]}
        values={formData}
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
        submitLabel="Save"
        loading={saving}
        onSubmit={handleUpdate}
        onCancel={() => setEditDialogOpen(false)}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Project"
        message={
          <>
            <Typography>Are you sure you want to delete <strong>{selectedProject?.name}</strong>?</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>This will permanently delete the project and all associated data.</Typography>
          </>
        }
        confirmLabel="Delete"
        confirmColor="error"
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
};

export default Projects;
