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
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Storage as DatabaseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { DatabaseConfig } from '../types';
import { getDatabaseInfo, updateDatabaseConfig, resetDatabase, dropDatabase } from '../services/api';
import { LoadingSpinner, PageHeader, StatCard, ConfirmDialog } from '../components/common';

type DatabaseTarget = 'redis' | 'milvus' | 'postgres' | 'all';

const DatabaseSettings: React.FC = () => {
  const [config, setConfig] = useState<DatabaseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<'reset' | 'drop'>('reset');
  const [targetDatabase, setTargetDatabase] = useState<DatabaseTarget>('all');
  const [confirmText, setConfirmText] = useState('');

  const loadInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getDatabaseInfo();
      setConfig(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load database information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInfo(); }, [loadInfo]);

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await updateDatabaseConfig(config);
      setSuccess('Database configuration saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async () => {
    if (confirmText !== 'CONFIRM') {
      setError('Please type CONFIRM to proceed');
      return;
    }
    try {
      setProcessing(true);
      if (actionType === 'reset') {
        await resetDatabase(targetDatabase);
        setSuccess(`${targetDatabase === 'all' ? 'All databases' : targetDatabase.charAt(0).toUpperCase() + targetDatabase.slice(1)} reset successfully`);
      } else {
        await dropDatabase(targetDatabase);
        setSuccess(`${targetDatabase === 'all' ? 'All databases' : targetDatabase.charAt(0).toUpperCase() + targetDatabase.slice(1)} dropped successfully`);
      }
      setConfirmOpen(false);
      setConfirmText('');
      loadInfo();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${actionType} database`);
    } finally {
      setProcessing(false);
    }
  };

  const openConfirmDialog = (action: 'reset' | 'drop', target: DatabaseTarget) => {
    setActionType(action);
    setTargetDatabase(target);
    setConfirmText('');
    setConfirmOpen(true);
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading database info..." />;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Database Settings"
        subtitle="View database information and perform maintenance"
        onRefresh={loadInfo}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>{success}</Alert>}

      {/* Database Connection Info */}
      {config && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Database Configuration</Typography>
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

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>PostgreSQL</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Host"
                  value={config.postgres_host}
                  onChange={(e) => setConfig({ ...config, postgres_host: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Port"
                  type="number"
                  value={config.postgres_port}
                  onChange={(e) => setConfig({ ...config, postgres_port: Number(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Database"
                  value={config.postgres_db}
                  onChange={(e) => setConfig({ ...config, postgres_db: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>Redis</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Host"
                  value={config.redis_host}
                  onChange={(e) => setConfig({ ...config, redis_host: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Port"
                  type="number"
                  value={config.redis_port}
                  onChange={(e) => setConfig({ ...config, redis_port: Number(e.target.value) })}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>Milvus</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Host"
                  value={config.milvus_host}
                  onChange={(e) => setConfig({ ...config, milvus_host: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Port"
                  type="number"
                  value={config.milvus_port}
                  onChange={(e) => setConfig({ ...config, milvus_port: Number(e.target.value) })}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="PostgreSQL"
            value={config ? 'Configured' : 'Unknown'}
            subtitle={config ? `${config.postgres_host}:${config.postgres_port}` : ''}
            icon={<DatabaseIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Redis"
            value={config ? 'Configured' : 'Unknown'}
            subtitle={config ? `${config.redis_host}:${config.redis_port}` : ''}
            icon={<DatabaseIcon />}
            color="#f59e0b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Milvus"
            value={config ? 'Configured' : 'Unknown'}
            subtitle={config ? `${config.milvus_host}:${config.milvus_port}` : ''}
            icon={<DatabaseIcon />}
            color="#7c3aed"
          />
        </Grid>
      </Grid>

      {/* Individual Database Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Individual Database Actions</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Reset or drop individual databases. Reset clears data but keeps schema, drop removes everything.
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>PostgreSQL</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" color="warning" startIcon={<RefreshIcon />} onClick={() => openConfirmDialog('reset', 'postgres')}>
                    Reset
                  </Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => openConfirmDialog('drop', 'postgres')}>
                    Drop
                  </Button>
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Redis</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" color="warning" startIcon={<RefreshIcon />} onClick={() => openConfirmDialog('reset', 'redis')}>
                    Reset
                  </Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => openConfirmDialog('drop', 'redis')}>
                    Drop
                  </Button>
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Milvus</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" color="warning" startIcon={<RefreshIcon />} onClick={() => openConfirmDialog('reset', 'milvus')}>
                    Reset
                  </Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => openConfirmDialog('drop', 'milvus')}>
                    Drop
                  </Button>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <WarningIcon color="error" />
            <Typography variant="h6" color="error.main">Danger Zone</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            These actions affect ALL databases and cannot be undone. Use with extreme caution.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              startIcon={<RefreshIcon />}
              variant="outlined"
              color="warning"
              onClick={() => openConfirmDialog('reset', 'all')}
            >
              Reset All Databases
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              variant="outlined"
              color="error"
              onClick={() => openConfirmDialog('drop', 'all')}
            >
              Drop All Databases
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={`${actionType === 'reset' ? 'Reset' : 'Drop'} ${targetDatabase === 'all' ? 'All Databases' : targetDatabase.charAt(0).toUpperCase() + targetDatabase.slice(1)}`}
        message={
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionType === 'reset'
                ? `This will reset ${targetDatabase === 'all' ? 'all databases' : targetDatabase}, clearing all data while keeping the schema.`
                : `This will completely destroy ${targetDatabase === 'all' ? 'all databases' : targetDatabase}. All data will be permanently lost.`}
            </Alert>
            <Typography sx={{ mb: 2 }}>Type "CONFIRM" to proceed:</Typography>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              style={{ width: '100%', padding: '8px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="CONFIRM"
            />
          </Box>
        }
        confirmLabel={actionType === 'reset' ? 'Reset' : 'Drop'}
        confirmColor="error"
        loading={processing}
        onConfirm={handleAction}
        onCancel={() => { setConfirmOpen(false); setConfirmText(''); }}
      />
    </Box>
  );
};

export default DatabaseSettings;
