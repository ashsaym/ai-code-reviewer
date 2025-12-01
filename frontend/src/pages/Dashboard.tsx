import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  LinearProgress,
  Paper,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle as HealthyIcon,
  Error as UnhealthyIcon,
  Warning as WarningIcon,
  Folder as ProjectsIcon,
  Work as JobsIcon,
  Storage as CacheIcon,
  Chat as ChatIcon,
  Code as CodeIcon,
  Speed as SpeedIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import { 
  LoadingSpinner, 
  PageHeader, 
  StatCard, 
  ActionCard 
} from '../components/common';

const formatUptime = (seconds?: number): string => {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { health, cacheStats, projects, loading, refreshAll } = useApp();

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  const databases = health?.databases || { postgres: false, redis: false, milvus: false };
  const healthyServices = Object.values(databases).filter(Boolean).length;
  const totalServices = Object.keys(databases).length;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to InfraMind AI - Your AI-powered code assistant"
        onRefresh={refreshAll}
      />

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Projects"
            value={projects.length}
            subtitle="Active projects"
            icon={<ProjectsIcon />}
            color="#2563eb"
            onClick={() => navigate('/projects')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Services"
            value={`${healthyServices}/${totalServices}`}
            subtitle="Services healthy"
            icon={<SpeedIcon />}
            color={healthyServices === totalServices ? '#10b981' : '#f59e0b'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Cache"
            value={cacheStats?.total_keys || 0}
            subtitle={`${cacheStats?.memory_used || 'N/A'} used`}
            icon={<CacheIcon />}
            color="#7c3aed"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Uptime"
            value={formatUptime(health?.uptime_seconds)}
            subtitle={`Version ${health?.version || 'N/A'}`}
            icon={<TimeIcon />}
            color="#06b6d4"
          />
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* System Health */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  System Health
                </Typography>
                <Chip
                  icon={
                    health?.status === 'healthy' ? <HealthyIcon /> : 
                    health?.status === 'degraded' ? <WarningIcon /> : <UnhealthyIcon />
                  }
                  label={health?.status || 'Unknown'}
                  color={
                    health?.status === 'healthy' ? 'success' : 
                    health?.status === 'degraded' ? 'warning' : 'error'
                  }
                  size="small"
                />
              </Box>

              {/* Services Status */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(databases).map(([service, status]) => (
                  <Box key={service}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {service}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color={status ? 'success.main' : 'error.main'}
                        fontWeight={500}
                      >
                        {status ? 'Connected' : 'Disconnected'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={status ? 100 : 0}
                      color={status ? 'success' : 'error'}
                      sx={{ height: 6, borderRadius: 1 }}
                    />
                  </Box>
                ))}
              </Box>

              {/* Issues */}
              {health?.issues && health.issues.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    Issues Detected:
                  </Typography>
                  {health.issues.map((issue, idx) => (
                    <Typography key={idx} variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      • {issue}
                    </Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Get started with InfraMind AI
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <ActionCard
                  icon={<ProjectsIcon />}
                  iconColor="#2563eb"
                  title="Manage Projects"
                  description="Create and configure projects"
                  onClick={() => navigate('/projects')}
                />

                <ActionCard
                  icon={<JobsIcon />}
                  iconColor="#7c3aed"
                  title="View Jobs"
                  description="Monitor sync and embedding jobs"
                  onClick={() => navigate('/jobs')}
                />

                {projects.length > 0 && (
                  <ActionCard
                    icon={<ChatIcon />}
                    iconColor="#10b981"
                    title="Start Chatting"
                    description={`Chat with ${projects[0].name}`}
                    onClick={() => navigate(`/chat/${projects[0].id}`)}
                  />
                )}

                <ActionCard
                  icon={<CodeIcon />}
                  iconColor="#f59e0b"
                  title="Configure Settings"
                  description="Setup GitHub, OpenWebUI, and more"
                  onClick={() => navigate('/settings/github')}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Recent Projects
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowIcon />}
                    onClick={() => navigate('/projects')}
                  >
                    View All
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  {projects.slice(0, 4).map((project) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={project.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          height: '100%',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            borderColor: 'primary.main',
                          },
                        }}
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: 'primary.main',
                              fontSize: '0.875rem',
                            }}
                          >
                            {project.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography fontWeight={600} noWrap>
                            {project.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {project.description || 'No description'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip 
                            size="small" 
                            label={`${project.source_count || 0} sources`}
                            sx={{ fontSize: '0.75rem' }}
                          />
                          <Chip 
                            size="small" 
                            label={`${project.total_files || 0} files`}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;
