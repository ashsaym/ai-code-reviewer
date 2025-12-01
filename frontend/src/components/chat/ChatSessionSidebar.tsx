import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Button,
  Paper,
  Tooltip,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { ChatSession } from '../../types';
import { getChatSessions, deleteChatSession } from '../../services/api';
import { ConfirmDialog } from '../common';

interface ChatSessionSidebarProps {
  projectId: string;
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

const ChatSessionSidebar: React.FC<ChatSessionSidebarProps> = ({
  projectId,
  currentSessionId,
  onSessionSelect,
  onNewSession,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const response = await getChatSessions(projectId);
      setSessions(response.data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Listen for session changes
  useEffect(() => {
    const handleSessionChange = () => loadSessions();
    window.addEventListener('chatSessionsChanged', handleSessionChange);
    return () => window.removeEventListener('chatSessionsChanged', handleSessionChange);
  }, [loadSessions]);

  const handleDelete = async () => {
    if (!deleteSessionId) return;
    try {
      setDeleting(true);
      await deleteChatSession(deleteSessionId);
      setSessions((prev) => prev.filter((s) => s.id !== deleteSessionId));
      setDeleteSessionId(null);
      // If deleted session was current, notify parent
      if (deleteSessionId === currentSessionId) {
        const remaining = sessions.filter((s) => s.id !== deleteSessionId);
        if (remaining.length > 0) {
          onSessionSelect(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: 280,
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={600}>Chat History</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onNewSession}
          size="small"
        >
          New Chat
        </Button>
      </Box>

      {/* Sessions List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : sessions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <ChatIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No chat sessions yet
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Start a new chat to begin
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 1 }}>
            {sessions.map((session) => (
              <ListItem
                key={session.id}
                disablePadding
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  selected={session.id === currentSessionId}
                  onClick={() => onSessionSelect(session.id)}
                  sx={{
                    borderRadius: 1.5,
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: alpha('#2563eb', 0.1),
                      '&:hover': { bgcolor: alpha('#2563eb', 0.15) },
                    },
                  }}
                >
                  <ChatIcon sx={{ fontSize: 18, mr: 1.5, color: 'text.secondary' }} />
                  <ListItemText
                    primary={
                      <Typography variant="body2" noWrap fontWeight={session.id === currentSessionId ? 600 : 400}>
                        {session.name || session.title || 'Chat'}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Typography variant="caption" color="text.disabled">
                          {formatDate(session.updated_at || session.created_at)}
                        </Typography>
                        {session.message_count !== undefined && session.message_count > 0 && (
                          <Typography variant="caption" color="text.disabled">
                            • {session.message_count} msgs
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteSessionId(session.id);
                        }}
                        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteSessionId}
        title="Delete Chat Session"
        message="Are you sure you want to delete this chat session? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteSessionId(null)}
      />
    </Paper>
  );
};

export default ChatSessionSidebar;
