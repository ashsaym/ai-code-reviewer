import React, { useState } from 'react';
import { Box, Paper, Avatar, IconButton, Tooltip, Typography, TextField, CircularProgress } from '@mui/material';
import {
  Psychology as AIIcon,
  Person as PersonIcon,
  ContentCopy as CopyIcon,
  Refresh as RegenerateIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { ChatMessage } from '../../types';
import MarkdownRenderer from '../MarkdownRenderer';
import ThinkingDisplay from './ThinkingDisplay';
import FileRelevanceDisplay from './FileRelevanceDisplay';
import MessageStats from './MessageStats';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  currentReasoning?: string;
  onCopy?: (content: string) => void;
  onFileClick?: (filePath: string) => void;
  onRegenerate?: (messageId: string | number) => void;
  onEdit?: (messageId: string | number, newContent: string) => void;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isStreaming = false,
  currentReasoning,
  onCopy,
  onFileClick,
  onRegenerate,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';
  const showThinking = !isUser && (message.reasoning || (isStreaming && currentReasoning));
  const showFileRelevance = !isUser && message.file_relevance && message.file_relevance.length > 0;

  const handleEditSave = () => {
    if (onEdit && editContent.trim()) {
      onEdit(message.id, editContent);
      setIsEditing(false);
    }
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <Box>
      {/* Thinking display */}
      {showThinking && (
        <ThinkingDisplay
          content={message.reasoning || currentReasoning || ''}
          isStreaming={isStreaming && !!currentReasoning}
        />
      )}

      {/* File relevance display */}
      {showFileRelevance && (
        <FileRelevanceDisplay files={message.file_relevance!} onFileClick={onFileClick} />
      )}

      {/* Message bubble */}
      {(isUser || message.content) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            mb: 2,
          }}
        >
          {/* Assistant avatar */}
          {!isUser && (
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 36,
                height: 36,
                mr: 1.5,
                mt: 0.5,
              }}
            >
              <AIIcon sx={{ fontSize: 20 }} />
            </Avatar>
          )}

          {/* Message content */}
          <Paper
            elevation={isUser ? 2 : 1}
            sx={{
              p: 2,
              maxWidth: isUser ? '70%' : '85%',
              bgcolor: isUser ? 'primary.main' : 'background.paper',
              color: isUser ? 'white' : 'text.primary',
              borderRadius: 3,
              border: isUser ? 'none' : '1px solid',
              borderColor: 'divider',
            }}
          >
            {isUser ? (
              isEditing ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&:hover fieldset': { borderColor: 'white' },
                      },
                      '& .MuiInputBase-input': { color: 'white' },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 0.5 }}>
                    <IconButton size="small" onClick={handleEditCancel} sx={{ color: 'white' }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={handleEditSave} sx={{ color: 'white' }}>
                      <CheckIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <>
                  <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {message.content}
                  </Typography>
                  {/* Edit button for user messages */}
                  {!isStreaming && onEdit && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Tooltip title="Edit message">
                        <IconButton 
                          size="small" 
                          onClick={() => setIsEditing(true)}
                          sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </>
              )
            ) : (
              <>
                {message.content && <MarkdownRenderer content={message.content} />}
                
                {/* Streaming cursor */}
                {isStreaming && message.isStreaming && (
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      width: 8,
                      height: 16,
                      bgcolor: 'primary.main',
                      ml: 0.5,
                      animation: 'blink 1s infinite',
                      '@keyframes blink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0 },
                      },
                    }}
                  />
                )}

                {/* Action buttons for assistant messages */}
                {!isStreaming && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 0.5 }}>
                    {onCopy && (
                      <Tooltip title="Copy">
                        <IconButton size="small" onClick={() => onCopy(message.content)}>
                          <CopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onRegenerate && (
                      <Tooltip title="Regenerate response">
                        <IconButton 
                          size="small" 
                          onClick={() => onRegenerate(message.id)}
                        >
                          <RegenerateIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                )}

                
                {/* Always show loading or stats */}
                {!message.content ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Generating response...
                    </Typography>
                  </Box>
                ) : (
                  <MessageStats
                    tokensUsed={message.tokens_used}
                    tokensPerSecond={message.tokens_per_second}
                    model={message.model}
                    promptTokens={message.prompt_tokens}
                    completionTokens={message.completion_tokens}
                  />
                )}
              </>
            )}
          </Paper>

          {/* User avatar */}
          {isUser && (
            <Avatar
              sx={{
                bgcolor: 'grey.400',
                width: 36,
                height: 36,
                ml: 1.5,
                mt: 0.5,
              }}
            >
              <PersonIcon sx={{ fontSize: 20 }} />
            </Avatar>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ChatMessageBubble;
