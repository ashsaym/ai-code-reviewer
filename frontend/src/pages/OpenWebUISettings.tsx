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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { OpenWebUIConfig } from '../types';
import { getOpenWebUIConfigs, createOpenWebUIConfig, updateOpenWebUIConfig, deleteOpenWebUIConfig, setDefaultOpenWebUIConfig, testOpenWebUIConfig } from '../services/api';
import { LoadingSpinner, PageHeader, EmptyState, ConfirmDialog } from '../components/common';

const OpenWebUISettings: React.FC = () => {
  const [configs, setConfigs] = useState<OpenWebUIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [models, setModels] = useState<{ chat: string[]; embedding: string[] }>({ chat: [], embedding: [] });
  const [modelsSuccess, setModelsSuccess] = useState<string | null>(null);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<OpenWebUIConfig | null>(null);
  const [formData, setFormData] = useState({ name: '', api_url: '', api_key: '', default_chat_model: '', default_embedding_model: '' });
  const [manualChatModel, setManualChatModel] = useState('');
  const [manualEmbeddingModel, setManualEmbeddingModel] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getOpenWebUIConfigs();
      setConfigs(response.data.configs || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load OpenWebUI configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selectedConfig) {
        await updateOpenWebUIConfig(selectedConfig.id, formData);
      } else {
        await createOpenWebUIConfig(formData);
      }
      setFormOpen(false);
      setSelectedConfig(null);
      setFormData({ name: '', api_url: '', api_key: '', default_chat_model: '', default_embedding_model: '' });
      loadConfigs();
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
      await deleteOpenWebUIConfig(selectedConfig.id);
      setDeleteOpen(false);
      setSelectedConfig(null);
      loadConfigs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (config: OpenWebUIConfig) => {
    try {
      await setDefaultOpenWebUIConfig(config.id);
      loadConfigs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to set default');
    }
  };

  const handleGetModels = async () => {
    if (!formData.api_url || !formData.api_key) {
      setError('Please provide API URL and API Key first');
      return;
    }
    
    try {
      setFetchingModels(true);
      setError(null);
      setModelsSuccess(null);
      setShowManualInput(false);
      
      // Create a temporary config to test
      let configId = selectedConfig?.id;
      
      // If editing existing config, use it; otherwise create temp config
      if (!configId) {
        const tempConfig = await createOpenWebUIConfig({
          name: formData.name || 'Temp Config',
          api_url: formData.api_url,
          api_key: formData.api_key,
        });
        configId = tempConfig.data.id;
      }
      
      // Test the config and get models
      const response = await testOpenWebUIConfig(configId);
      
      if (response.data.success && response.data.models) {
        const chatModels = response.data.models.chat_models || [];
        const embeddingModels = response.data.models.embedding_models || [];
        
        if (chatModels.length === 0 && embeddingModels.length === 0) {
          setError('No models found. Please add models manually below.');
          setShowManualInput(true);
        } else {
          setModels({
            chat: chatModels,
            embedding: embeddingModels,
          });
          setModelsSuccess(`Successfully fetched ${chatModels.length} chat models and ${embeddingModels.length} embedding models`);
        }
        
        // If it was a temp config and we're not editing, delete it
        if (!selectedConfig) {
          await deleteOpenWebUIConfig(configId);
        }
      } else {
        setError(response.data.message || 'Failed to fetch models. Please add models manually below.');
        setShowManualInput(true);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch models from OpenWebUI';
      setError(`${errorMsg}. Please add models manually below.`);
      setShowManualInput(true);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleAddManualChatModel = () => {
    if (manualChatModel.trim()) {
      setModels(prev => ({
        ...prev,
        chat: [...prev.chat, manualChatModel.trim()]
      }));
      setManualChatModel('');
      setModelsSuccess(`Added chat model: ${manualChatModel.trim()}`);
    }
  };

  const handleAddManualEmbeddingModel = () => {
    if (manualEmbeddingModel.trim()) {
      setModels(prev => ({
        ...prev,
        embedding: [...prev.embedding, manualEmbeddingModel.trim()]
      }));
      setManualEmbeddingModel('');
      setModelsSuccess(`Added embedding model: ${manualEmbeddingModel.trim()}`);
    }
  };

  const openEditDialog = (config: OpenWebUIConfig) => {
    setSelectedConfig(config);
    setFormData({ name: config.name, api_url: config.api_url, api_key: '', default_chat_model: config.default_chat_model || '', default_embedding_model: config.default_embedding_model || '' });
    setModels({ chat: [], embedding: [] });
    setManualChatModel('');
    setManualEmbeddingModel('');
    setShowManualInput(false);
    setModelsSuccess(null);
    setFormOpen(true);
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading OpenWebUI settings..." />;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="OpenWebUI Settings"
        subtitle="Manage OpenWebUI API configurations for AI models"
        onRefresh={loadConfigs}
        actions={
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => { 
            setSelectedConfig(null); 
            setFormData({ name: '', api_url: '', api_key: '', default_chat_model: '', default_embedding_model: '' }); 
            setModels({ chat: [], embedding: [] });
            setManualChatModel('');
            setManualEmbeddingModel('');
            setShowManualInput(false);
            setModelsSuccess(null);
            setFormOpen(true); 
          }}>
            Add Configuration
          </Button>
        }
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}

      {configs.length === 0 ? (
        <EmptyState icon={<CloudIcon />} title="No OpenWebUI configurations" description="Add an OpenWebUI configuration to enable AI features" actionLabel="Add Configuration" onAction={() => setFormOpen(true)} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>API URL</TableCell>
                <TableCell>Chat Model</TableCell>
                <TableCell>Embedding Model</TableCell>
                <TableCell>Default</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell><Typography fontWeight={600}>{config.name}</Typography></TableCell>
                  <TableCell>{config.api_url}</TableCell>
                  <TableCell>{config.default_chat_model || '-'}</TableCell>
                  <TableCell>{config.default_embedding_model || '-'}</TableCell>
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

      {/* Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedConfig ? 'Edit Configuration' : 'Add Configuration'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={{ mt: 2, mb: 2 }} required />
          <TextField fullWidth label="API URL" value={formData.api_url} onChange={(e) => setFormData({ ...formData, api_url: e.target.value })} sx={{ mb: 2 }} required helperText="e.g., http://localhost:3001/api" />
          <TextField fullWidth label="API Key" type="password" value={formData.api_key} onChange={(e) => setFormData({ ...formData, api_key: e.target.value })} sx={{ mb: 2 }} helperText={selectedConfig ? 'Leave empty to keep existing key' : ''} />
          
          <Box sx={{ mb: 2 }}>
            <Button 
              variant="outlined" 
              onClick={handleGetModels}
              disabled={!formData.api_url || !formData.api_key || fetchingModels}
              fullWidth
            >
              {fetchingModels ? <CircularProgress size={20} /> : 'Get Models'}
            </Button>
            {modelsSuccess && <Alert severity="success" sx={{ mt: 1 }}>{modelsSuccess}</Alert>}
          </Box>
          
          {showManualInput && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Add Models Manually
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField 
                  size="small"
                  fullWidth
                  label="Chat Model Name"
                  value={manualChatModel}
                  onChange={(e) => setManualChatModel(e.target.value)}
                  placeholder="e.g., gpt-4, llama3:8b"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddManualChatModel()}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddManualChatModel}
                  disabled={!manualChatModel.trim()}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField 
                  size="small"
                  fullWidth
                  label="Embedding Model Name"
                  value={manualEmbeddingModel}
                  onChange={(e) => setManualEmbeddingModel(e.target.value)}
                  placeholder="e.g., text-embedding-ada-002"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddManualEmbeddingModel()}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddManualEmbeddingModel}
                  disabled={!manualEmbeddingModel.trim()}
                >
                  Add
                </Button>
              </Box>
            </Box>
          )}
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Default Chat Model</InputLabel>
            <Select value={formData.default_chat_model} onChange={(e) => setFormData({ ...formData, default_chat_model: e.target.value })} label="Default Chat Model">
              <MenuItem value="">None</MenuItem>
              {models.chat.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Default Embedding Model</InputLabel>
            <Select value={formData.default_embedding_model} onChange={(e) => setFormData({ ...formData, default_embedding_model: e.target.value })} label="Default Embedding Model">
              <MenuItem value="">None</MenuItem>
              {models.embedding.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name || !formData.api_url || saving}>{saving ? <CircularProgress size={20} /> : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog open={deleteOpen} title="Delete Configuration" message={<Typography>Delete <strong>{selectedConfig?.name}</strong>?</Typography>} confirmLabel="Delete" confirmColor="error" loading={saving} onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </Box>
  );
};

export default OpenWebUISettings;
