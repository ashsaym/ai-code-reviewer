import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  alpha,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Delete as DeleteIcon,
  DeleteSweep as ClearAllIcon,
  Storage as StorageIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { CacheStats, CacheConfig } from '../types';
import { getCacheStats, clearEmbeddingCache, clearAllCache, getCacheConfig, updateCacheConfig, resetCacheConfig } from '../services/api';
import { LoadingSpinner, PageHeader, StatCard, ConfirmDialog } from '../components/common';

const CacheSettings: React.FC = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [config, setConfig] = useState<CacheConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearType, setClearType] = useState<'embeddings' | 'all'>('embeddings');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResponse, configResponse] = await Promise.all([
        getCacheStats(),
        getCacheConfig(),
      ]);
      setStats(statsResponse.data);
      setConfig(configResponse.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load cache data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClear = async () => {
    try {
      setClearing(true);
      if (clearType === 'embeddings') {
        await clearEmbeddingCache();
        setSuccess('Embedding cache cleared successfully');
      } else {
        await clearAllCache();
        setSuccess('All cache cleared successfully');
      }
      setConfirmOpen(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to clear cache');
    } finally {
      setClearing(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await updateCacheConfig(config);
      setSuccess('Cache configuration saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfig = async () => {
    try {
      setSaving(true);
      const response = await resetCacheConfig();
      setConfig(response.data);
      setSuccess('Cache configuration reset to defaults');
      setResetConfirmOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading cache settings..." />;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Cache Settings"
        subtitle="View and manage cache statistics and configuration"
        onRefresh={loadData}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>{success}</Alert>}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Status"
            value={stats?.status === 'connected' ? 'Connected' : 'Disconnected'}
            icon={<StorageIcon />}
            color={stats?.status === 'connected' ? '#10b981' : '#ef4444'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Embedding Cache"
            value={stats?.embedding_cache_size || 0}
            subtitle="cached embeddings"
            icon={<StorageIcon />}
            color="#2563eb"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Keys"
            value={stats?.total_keys || 0}
            icon={<StorageIcon />}
            color="#7c3aed"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Memory Used"
            value={stats?.memory_used || 'N/A'}
            icon={<StorageIcon />}
            color="#f59e0b"
          />
        </Grid>
      </Grid>

      {/* Cache Configuration */}
      {config && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Cache Configuration</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<RefreshIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => setResetConfirmOpen(true)}
                >
                  Reset to Defaults
                </Button>
                <Button
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  variant="contained"
                  size="small"
                  onClick={handleSaveConfig}
                  disabled={saving}
                >
                  Save Changes
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    />
                  }
                  label="Cache Enabled"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="General TTL (seconds)"
                  type="number"
                  value={config.ttl_seconds}
                  onChange={(e) => setConfig({ ...config, ttl_seconds: Number(e.target.value) })}
                  helperText="Time-to-live for general cache entries"
                  inputProps={{ min: 60 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Embedding TTL (seconds)"
                  type="number"
                  value={config.embedding_ttl_seconds}
                  onChange={(e) => setConfig({ ...config, embedding_ttl_seconds: Number(e.target.value) })}
                  helperText="Time-to-live for cached embeddings"
                  inputProps={{ min: 60 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Max Cache Size (MB)"
                  type="number"
                  value={config.max_cache_size_mb}
                  onChange={(e) => setConfig({ ...config, max_cache_size_mb: Number(e.target.value) })}
                  helperText="Maximum cache size in megabytes"
                  inputProps={{ min: 100 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Cache Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Clear cached data to free up memory or force fresh embeddings.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              startIcon={<DeleteIcon />}
              variant="outlined"
              color="warning"
              onClick={() => { setClearType('embeddings'); setConfirmOpen(true); }}
            >
              Clear Embedding Cache
            </Button>
            <Button
              startIcon={<ClearAllIcon />}
              variant="outlined"
              color="error"
              onClick={() => { setClearType('all'); setConfirmOpen(true); }}
            >
              Clear All Cache
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Counters */}
      {stats?.counters && Object.keys(stats.counters).length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Cache Counters</Typography>
            <Grid container spacing={2}>
              {Object.entries(stats.counters).map(([key, value]) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={key}>
                  <Box sx={{ p: 2, bgcolor: alpha('#2563eb', 0.05), borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">{key}</Typography>
                    <Typography variant="h5" fontWeight="bold">{value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Clear Cache Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={clearType === 'embeddings' ? 'Clear Embedding Cache' : 'Clear All Cache'}
        message={
          <Typography>
            {clearType === 'embeddings'
              ? 'This will clear all cached embeddings. New embeddings will be generated when needed.'
              : 'This will clear ALL cached data including embeddings and general cache.'}
          </Typography>
        }
        confirmLabel="Clear"
        confirmColor="error"
        loading={clearing}
        onConfirm={handleClear}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Reset Config Confirm Dialog */}
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset Cache Configuration"
        message={
          <Typography>
            This will reset all cache configuration settings to their default values.
          </Typography>
        }
        confirmLabel="Reset"
        confirmColor="warning"
        loading={saving}
        onConfirm={handleResetConfig}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </Box>
  );
};

export default CacheSettings;
