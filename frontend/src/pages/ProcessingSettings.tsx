import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Slider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { ProcessingConfig } from '../types';
import { getProcessingConfig, updateProcessingConfig, resetProcessingConfig } from '../services/api';
import { LoadingSpinner, PageHeader, ConfirmDialog } from '../components/common';

interface ConfigFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  helperText?: string;
  unit?: string;
}

const ConfigField: React.FC<ConfigFieldProps> = ({ label, value, onChange, min = 1, max = 1000, step = 1, helperText, unit }) => (
  <Card>
    <CardContent>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Slider
          value={value}
          onChange={(_, v) => onChange(v as number)}
          min={min}
          max={max}
          step={step}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          size="small"
          sx={{ width: 100 }}
          inputProps={{ min, max, step }}
        />
        {unit && <Typography variant="body2" color="text.secondary">{unit}</Typography>}
      </Box>
      {helperText && <Typography variant="caption" color="text.secondary">{helperText}</Typography>}
    </CardContent>
  </Card>
);

const ProcessingSettings: React.FC = () => {
  const [config, setConfig] = useState<ProcessingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getProcessingConfig();
      setConfig(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load processing configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await updateProcessingConfig(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const response = await resetProcessingConfig();
      setConfig(response.data);
      setSuccess(true);
      setResetConfirmOpen(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProcessingConfig, value: number) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading processing settings..." />;
  if (!config) return <Alert severity="error">Failed to load configuration</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Processing Settings"
        subtitle="Configure embedding and processing parameters"
        onRefresh={loadConfig}
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
      {success && <Alert severity="success" sx={{ mb: 3 }}>Configuration saved successfully!</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Embedding Batch Size" value={config.embedding_batch_size} onChange={(v) => updateField('embedding_batch_size', v)} min={1} max={100} helperText="Number of texts to embed in a single batch" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Max Concurrent Requests" value={config.max_concurrent_requests} onChange={(v) => updateField('max_concurrent_requests', v)} min={1} max={50} helperText="Maximum parallel API requests" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Max Document Size" value={config.max_document_size_mb} onChange={(v) => updateField('max_document_size_mb', v)} min={1} max={100} unit="MB" helperText="Maximum file size to process" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Max Chunk Size" value={config.max_chunk_size} onChange={(v) => updateField('max_chunk_size', v)} min={100} max={8000} unit="tokens" helperText="Maximum tokens per chunk" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Chunk Overlap" value={config.chunk_overlap} onChange={(v) => updateField('chunk_overlap', v)} min={0} max={1000} unit="tokens" helperText="Overlap between consecutive chunks" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Requests Per Minute" value={config.requests_per_minute} onChange={(v) => updateField('requests_per_minute', v)} min={1} max={1000} helperText="Rate limit for API requests" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Tokens Per Minute" value={config.tokens_per_minute} onChange={(v) => updateField('tokens_per_minute', v)} min={1000} max={1000000} step={1000} helperText="Token rate limit" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Max Retries" value={config.max_retries} onChange={(v) => updateField('max_retries', v)} min={0} max={10} helperText="Maximum retry attempts on failure" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Retry Delay" value={config.retry_delay_seconds} onChange={(v) => updateField('retry_delay_seconds', v)} min={1} max={60} unit="seconds" helperText="Wait time between retries" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Default Batch Size" value={config.default_batch_size} onChange={(v) => updateField('default_batch_size', v)} min={1} max={100} helperText="Default processing batch size" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Max Concurrent Jobs" value={config.max_concurrent} onChange={(v) => updateField('max_concurrent', v)} min={1} max={20} helperText="Maximum concurrent processing jobs" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Max Parallel Files" value={config.max_parallel_files} onChange={(v) => updateField('max_parallel_files', v)} min={1} max={20} helperText="Maximum files to process in parallel" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Max Files Per Batch" value={config.max_files_per_batch} onChange={(v) => updateField('max_files_per_batch', v)} min={1} max={100} helperText="Maximum files per processing batch" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Max Documents Per Batch" value={config.max_documents_per_batch} onChange={(v) => updateField('max_documents_per_batch', v)} min={1} max={200} helperText="Maximum documents per processing batch" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ConfigField label="Parallel Chunks" value={config.parallel_chunks} onChange={(v) => updateField('parallel_chunks', v)} min={1} max={20} helperText="Number of chunks to process in parallel" />
        </Grid>
      </Grid>

      {/* Reset Confirm Dialog */}
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset Processing Configuration"
        message={
          <Typography>
            This will reset all processing configuration settings to their default values from the environment.
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

export default ProcessingSettings;
