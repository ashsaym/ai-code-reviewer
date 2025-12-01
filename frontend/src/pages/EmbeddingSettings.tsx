import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  TextField,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Save as SaveIcon, Psychology as AIIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { EmbeddingConfig } from '../types';
import { getEmbeddingSettings, updateEmbeddingSettings, resetEmbeddingSettings } from '../services/api';
import { LoadingSpinner, PageHeader, StatCard, ConfirmDialog } from '../components/common';

const EmbeddingSettings: React.FC = () => {
  const [settings, setSettings] = useState<EmbeddingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getEmbeddingSettings();
      setSettings(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load embedding settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await updateEmbeddingSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const response = await resetEmbeddingSettings();
      setSettings(response.data);
      setSuccess(true);
      setResetConfirmOpen(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading embedding settings..." />;
  if (!settings) return <Alert severity="error">Failed to load settings</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Embedding Settings"
        subtitle="Configure embedding model parameters"
        onRefresh={loadSettings}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<RefreshIcon />}
              variant="outlined"
              onClick={() => setResetConfirmOpen(true)}
            >
              Reset to Defaults
            </Button>
            <Button startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />} variant="contained" onClick={handleSave} disabled={saving}>
              Save Changes
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>Settings saved successfully!</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Model"
            value={settings.model_name || 'Default'}
            icon={<AIIcon />}
            color="#2563eb"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Dimension"
            value={settings.dimension || 1536}
            icon={<AIIcon />}
            color="#7c3aed"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Context Size"
            value={settings.context_size || 8192}
            icon={<AIIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Batch Size"
            value={settings.batch_size || 10}
            icon={<AIIcon />}
            color="#f59e0b"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Embedding Configuration</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Embedding Model"
                    value={settings.model_name || ''}
                    onChange={(e) => setSettings({ ...settings, model_name: e.target.value })}
                    helperText="Name of the embedding model to use"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Embedding Dimension"
                    type="number"
                    value={settings.dimension || 1536}
                    onChange={(e) => setSettings({ ...settings, dimension: Number(e.target.value) })}
                    helperText="Vector dimension (e.g., 1536 for text-embedding-3-small)"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Context Size"
                    type="number"
                    value={settings.context_size || 8192}
                    onChange={(e) => setSettings({ ...settings, context_size: Number(e.target.value) })}
                    helperText="Maximum context window for embeddings"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Batch Size"
                    type="number"
                    value={settings.batch_size || 10}
                    onChange={(e) => setSettings({ ...settings, batch_size: Number(e.target.value) })}
                    helperText="Number of texts to embed per batch"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Max Concurrent Requests"
                    type="number"
                    value={settings.max_concurrent_requests || 5}
                    onChange={(e) => setSettings({ ...settings, max_concurrent_requests: Number(e.target.value) })}
                    helperText="Maximum parallel embedding requests"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reset Confirm Dialog */}
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset Embedding Configuration"
        message={
          <Typography>
            This will reset all embedding configuration settings to their default values from the environment.
          </Typography>
        }
        confirmLabel="Reset"
        confirmColor="warning"
        loading={saving}
        onConfirm={handleReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </Box>
  );
};

export default EmbeddingSettings;
