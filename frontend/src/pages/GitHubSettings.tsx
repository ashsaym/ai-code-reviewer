import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  GitHub as GitHubIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as TestIcon,
} from '@mui/icons-material';
import { GitHubConfig } from '../types';
import { getGitHubConfigs, createGitHubConfig, updateGitHubConfig, deleteGitHubConfig, setDefaultGitHubConfig, testGitHubConfig } from '../services/api';
import { LoadingSpinner, PageHeader, EmptyState, ConfirmDialog } from '../components/common';

const GitHubSettings: React.FC = () => {
  const [configs, setConfigs] = useState<GitHubConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ configId: string; success: boolean; message: string; user?: any } | null>(null);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<GitHubConfig | null>(null);
  const [formData, setFormData] = useState({ name: '', host: 'github.com', username: '', pat_token: '' });

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getGitHubConfigs();
      setConfigs(response.data.configs || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load GitHub configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selectedConfig) {
        await updateGitHubConfig(selectedConfig.id, formData);
        setSuccess('Configuration updated successfully');
      } else {
        await createGitHubConfig(formData);
        setSuccess('Configuration created successfully');
      }
      setFormOpen(false);
      setSelectedConfig(null);
      setFormData({ name: '', host: 'github.com', username: '', pat_token: '' });
      loadConfigs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedConfig) return;
    try {
      setSaving(true);
      await deleteGitHubConfig(selectedConfig.id);
      setDeleteOpen(false);
      setSelectedConfig(null);
      setSuccess('Configuration deleted successfully');
      loadConfigs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (config: GitHubConfig) => {
    try {
      await setDefaultGitHubConfig(config.id);
      setSuccess(`${config.name} set as default`);
      loadConfigs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to set default');
    }
  };

  const handleTest = async (config: GitHubConfig) => {
    try {
      setTesting(config.id);
      setTestResult(null);
      const response = await testGitHubConfig(config.id);
      setTestResult({
        configId: config.id,
        success: response.data.success,
        message: response.data.message,
        user: response.data.user,
      });
    } catch (err: any) {
      setTestResult({
        configId: config.id,
        success: false,
        message: err.response?.data?.detail || 'Test failed',
      });
    } finally {
      setTesting(null);
    }
  };

  const openEditDialog = (config: GitHubConfig) => {
    setSelectedConfig(config);
    setFormData({ name: config.name, host: config.host, username: config.username || '', pat_token: '' });
    setFormOpen(true);
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading GitHub settings..." />;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="GitHub Settings"
        subtitle="Manage GitHub API configurations"
        onRefresh={loadConfigs}
        actions={
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setSelectedConfig(null); setFormData({ name: '', host: 'github.com', username: '', pat_token: '' }); setFormOpen(true); }}>
            Add Configuration
          </Button>
        }
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>{success}</Alert>}

      {configs.length === 0 ? (
        <EmptyState icon={<GitHubIcon />} title="No GitHub configurations" description="Add a GitHub configuration to connect your repositories" actionLabel="Add Configuration" onAction={() => setFormOpen(true)} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Token</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Default</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell><Typography fontWeight={600}>{config.name}</Typography></TableCell>
                  <TableCell>{config.host}</TableCell>
                  <TableCell>{config.username || '-'}</TableCell>
                  <TableCell><Typography fontFamily="monospace">{config.pat_token_masked || '***'}</Typography></TableCell>
                  <TableCell>
                    {testResult?.configId === config.id ? (
                      <Chip
                        icon={testResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
                        label={testResult.success ? 'Connected' : 'Failed'}
                        color={testResult.success ? 'success' : 'error'}
                        size="small"
                      />
                    ) : (
                      <Button
                        size="small"
                        startIcon={testing === config.id ? <CircularProgress size={16} /> : <TestIcon />}
                        onClick={() => handleTest(config)}
                        disabled={testing === config.id}
                      >
                        Test
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleSetDefault(config)} color={config.is_default ? 'warning' : 'default'}>
                      {config.is_default ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openEditDialog(config)}><EditIcon /></IconButton>
                    <IconButton onClick={() => { setSelectedConfig(config); setDeleteOpen(true); }} color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Test Result Details */}
      {testResult && testResult.success && testResult.user && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setTestResult(null)}>
          <Typography variant="subtitle2">Connection successful!</Typography>
          <Typography variant="body2">
            User: {testResult.user.login} ({testResult.user.name || 'N/A'}) - {testResult.user.email || 'No email'}
          </Typography>
        </Alert>
      )}
      {testResult && !testResult.success && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setTestResult(null)}>
          {testResult.message}
        </Alert>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedConfig ? 'Edit Configuration' : 'Add Configuration'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={{ mt: 2, mb: 2 }} required />
          <TextField fullWidth label="Host" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} sx={{ mb: 2 }} helperText="e.g., github.com or your GitHub Enterprise host" />
          <TextField fullWidth label="Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="Personal Access Token" type="password" value={formData.pat_token} onChange={(e) => setFormData({ ...formData, pat_token: e.target.value })} helperText={selectedConfig ? 'Leave empty to keep existing token' : 'Required for private repositories'} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name || saving}>{saving ? <CircularProgress size={20} /> : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog open={deleteOpen} title="Delete Configuration" message={<Typography>Delete <strong>{selectedConfig?.name}</strong>?</Typography>} confirmLabel="Delete" confirmColor="error" loading={saving} onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </Box>
  );
};

export default GitHubSettings;
