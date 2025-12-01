import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Chip,
  Collapse,
  Tooltip,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Folder as ProjectsIcon,
  Work as JobsIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  CheckCircle as HealthyIcon,
  Error as UnhealthyIcon,
  Warning as WarningIcon,
  GitHub as GitHubIcon,
  Cloud as CloudIcon,
  Tune as TuneIcon,
  Storage as StorageIcon,
  Memory as DatabaseIcon,
  ExpandLess,
  ExpandMore,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Psychology as AIIcon,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import { getChatSessions, deleteChatSession, createChatSession } from '../services/api';
import { ChatSession } from '../types';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { health, projects, refreshAll, loading } = useApp();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(location.pathname.startsWith('/chat'));
  const [settingsOpen, setSettingsOpen] = useState(location.pathname.startsWith('/settings'));
  const [chatSessions, setChatSessions] = useState<(ChatSession & { project_name?: string })[]>([]);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Projects', icon: <ProjectsIcon />, path: '/projects' },
    { text: 'Jobs', icon: <JobsIcon />, path: '/jobs' },
  ];

  const settingsItems = [
    { text: 'GitHub', icon: <GitHubIcon />, path: '/settings/github' },
    { text: 'OpenWebUI', icon: <CloudIcon />, path: '/settings/openwebui' },
    { text: 'Processing', icon: <TuneIcon />, path: '/settings/processing' },
    { text: 'Cache', icon: <StorageIcon />, path: '/settings/cache' },
    { text: 'Embedding', icon: <AIIcon />, path: '/settings/embedding' },
    { text: 'Database', icon: <DatabaseIcon />, path: '/settings/database' },
  ];

  const loadChatSessions = useCallback(async () => {
    if (projects.length === 0) return;
    
    try {
      const allSessions: (ChatSession & { project_name?: string })[] = [];
      
      for (const proj of projects.slice(0, 5)) { // Limit to 5 projects for performance
        try {
          const response = await getChatSessions(proj.id);
          const sessions = (response.data.sessions || []).map((s: ChatSession) => ({
            ...s,
            project_name: proj.name,
          }));
          allSessions.push(...sessions);
        } catch (error) {
          console.error(`Failed to load sessions for project ${proj.id}:`, error);
        }
      }
      
      // Sort by updated_at and take top 10
      allSessions.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setChatSessions(allSessions.slice(0, 10));
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, [projects]);

  useEffect(() => {
    loadChatSessions();
  }, [loadChatSessions]);

  // Listen for chat session updates
  useEffect(() => {
    const handleChatUpdate = () => loadChatSessions();
    window.addEventListener('chatSessionsChanged', handleChatUpdate);
    return () => window.removeEventListener('chatSessionsChanged', handleChatUpdate);
  }, [loadChatSessions]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this chat session?')) {
      try {
        await deleteChatSession(sessionId);
        setChatSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // If we're viewing this session, navigate away
        if (location.pathname.includes(sessionId)) {
          navigate('/projects');
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const handleNewChat = async () => {
    if (projects.length === 0) {
      alert('Please create a project first');
      navigate('/projects');
      return;
    }
    
    try {
      const firstProject = projects[0];
      const response = await createChatSession(firstProject.id);
      window.dispatchEvent(new CustomEvent('chatSessionsChanged'));
      navigate(`/chat/${firstProject.id}/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
  };

  const getHealthIcon = () => {
    if (!health) return <WarningIcon />;
    switch (health.status) {
      case 'healthy':
        return <HealthyIcon />;
      case 'degraded':
      case 'healthy_with_warnings':
        return <WarningIcon />;
      default:
        return <UnhealthyIcon />;
    }
  };

  const getHealthColor = (): 'success' | 'warning' | 'error' => {
    if (!health) return 'error';
    switch (health.status) {
      case 'healthy':
        return 'success';
      case 'degraded':
      case 'healthy_with_warnings':
        return 'warning';
      default:
        return 'error';
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Toolbar sx={{ px: collapsed ? 1 : 2 }}>
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <AIIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: 'primary.main' }}>
              InfraMind
            </Typography>
          </Box>
        )}
        {collapsed && (
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, mx: 'auto' }}>
            <AIIcon sx={{ fontSize: 20 }} />
          </Avatar>
        )}
      </Toolbar>
      
      <Divider />
      
      {/* Main Navigation */}
      <List sx={{ px: 1, py: 1, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <Tooltip title={collapsed ? item.text : ''} placement="right">
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  minHeight: 44,
                  justifyContent: collapsed ? 'center' : 'initial',
                  px: collapsed ? 1 : 2,
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.text} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
        
        {/* Chats Section */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => !collapsed && setChatsOpen(!chatsOpen)}
            sx={{
              minHeight: 44,
              justifyContent: collapsed ? 'center' : 'initial',
              px: collapsed ? 1 : 2,
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
              <Badge badgeContent={chatSessions.length} color="primary" max={9}>
                <ChatIcon />
              </Badge>
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText primary="Chats" />
                {chatsOpen ? <ExpandLess /> : <ExpandMore />}
              </>
            )}
          </ListItemButton>
        </ListItem>
        
        {!collapsed && (
          <Collapse in={chatsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 1 }}>
              <ListItemButton
                onClick={handleNewChat}
                sx={{ pl: 3, py: 0.75, minHeight: 36 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <AddIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="New Chat" 
                  primaryTypographyProps={{ fontSize: '0.875rem', color: 'primary.main' }}
                />
              </ListItemButton>
              
              {chatSessions.map((session) => (
                <ListItemButton
                  key={session.id}
                  selected={location.pathname.includes(session.id)}
                  onClick={() => navigate(`/chat/${session.project_id}/${session.id}`)}
                  sx={{ pl: 3, py: 0.5, minHeight: 40 }}
                >
                  <ListItemText
                    primary={session.name || session.title || 'Untitled'}
                    secondary={session.project_name}
                    primaryTypographyProps={{ 
                      noWrap: true, 
                      fontSize: '0.8125rem',
                      fontWeight: location.pathname.includes(session.id) ? 600 : 400,
                    }}
                    secondaryTypographyProps={{ 
                      noWrap: true, 
                      fontSize: '0.6875rem',
                      sx: { opacity: 0.7 }
                    }}
                    sx={{ mr: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    sx={{ 
                      opacity: 0.5, 
                      p: 0.5,
                      '&:hover': { opacity: 1 } 
                    }}
                  >
                    <DeleteIcon fontSize="small" sx={{ fontSize: 16 }} />
                  </IconButton>
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}
        
        {/* Settings Section */}
        <ListItem disablePadding sx={{ mb: 0.5, mt: 1 }}>
          <ListItemButton
            onClick={() => !collapsed && setSettingsOpen(!settingsOpen)}
            sx={{
              minHeight: 44,
              justifyContent: collapsed ? 'center' : 'initial',
              px: collapsed ? 1 : 2,
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
              <SettingsIcon />
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText primary="Settings" />
                {settingsOpen ? <ExpandLess /> : <ExpandMore />}
              </>
            )}
          </ListItemButton>
        </ListItem>
        
        {!collapsed && (
          <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 1 }}>
              {settingsItems.map((item) => (
                <ListItemButton
                  key={item.text}
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  sx={{ pl: 3, py: 0.75, minHeight: 36 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {React.cloneElement(item.icon, { fontSize: 'small' })}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}
      </List>
      
      {/* Footer with collapse button */}
      <Divider />
      <Box sx={{ p: 1 }}>
        <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
          <IconButton 
            onClick={() => setCollapsed(!collapsed)}
            sx={{ 
              width: '100%',
              borderRadius: 2,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1 : 2,
            }}
          >
            <ChevronLeftIcon 
              sx={{ 
                transform: collapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }} 
            />
            {!collapsed && (
              <Typography variant="body2" sx={{ ml: 1 }}>
                Collapse
              </Typography>
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const drawerWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Refresh Button */}
          <Tooltip title="Refresh data">
            <IconButton onClick={refreshAll} disabled={loading}>
              <RefreshIcon sx={{ 
                animation: loading ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }} />
            </IconButton>
          </Tooltip>
          
          {/* Health Status */}
          <Tooltip title={`Status: ${health?.status || 'Unknown'}`}>
            <Chip
              icon={getHealthIcon()}
              label={health?.status || 'Loading...'}
              color={getHealthColor()}
              size="small"
              sx={{ ml: 1 }}
            />
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      {/* Drawer - Mobile */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Drawer - Desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              transition: 'width 0.2s ease-in-out',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'background.default',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
