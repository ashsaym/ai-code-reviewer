import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Psychology as AIIcon,
  Save as SaveIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import {
  getProjects,
  getChatSessions,
  createChatSession,
  getChatHistory,
  getAvailableModels,
  getChatSession,
  updateSessionSettings,
} from '../services/api';
import { Project, ChatMessage } from '../types';
import { LoadingSpinner } from '../components/common';
import { ChatMessageBubble, ChatInput } from '../components/chat';

// Custom hook for chat state management
const useChatState = (projectId?: string, sessionId?: string) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const res = await getProjects();
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, []);

  const loadSessions = useCallback(async (projId: string) => {
    try {
      const res = await getChatSessions(projId);
      return res.data.sessions || [];
    } catch (err) {
      console.error('Failed to load sessions:', err);
      return [];
    }
  }, []);

  const loadHistory = useCallback(async (sessId: string) => {
    try {
      const res = await getChatHistory(sessId);
      const msgs = res.data.messages || [];
      setMessages(msgs.map((m: any) => ({
        id: m.id,
        session_id: sessId,
        role: m.role,
        content: m.content,
        reasoning: m.metadata?.reasoning,
        file_relevance: m.metadata?.file_relevance,
        tokens_used: m.metadata?.tokens_used || m.metadata?.total_tokens_precise,
        prompt_tokens: m.metadata?.prompt_tokens,
        completion_tokens: m.metadata?.completion_tokens,
        model: m.metadata?.model,
        created_at: m.created_at,
      })));
    } catch (err) {
      console.error('Failed to load history:', err);
      setMessages([]);
    }
  }, []);

  const handleProjectChange = useCallback(async (projId: string) => {
    setSelectedProject(projId);
    setMessages([]);
    const sessions = await loadSessions(projId);
    if (sessions.length > 0) {
      navigate(`/chat/${projId}/${sessions[0].id}`);
    } else {
      navigate(`/chat/${projId}`);
    }
  }, [loadSessions, navigate]);

  const createSession = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const res = await createChatSession(selectedProject);
      window.dispatchEvent(new CustomEvent('chatSessionsChanged'));
      navigate(`/chat/${selectedProject}/${res.data.id}`);
      setMessages([]);
    } catch (err) {
      setError('Failed to create new chat session');
    }
  }, [selectedProject, navigate]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      await loadProjects();
      // Set project ID after projects are loaded
      if (projectId) {
        setSelectedProject(projectId);
      }
    };
    init();
  }, [projectId, loadProjects]);

  useEffect(() => {
    const init = async () => {
      if (!selectedProject) return;
      setLoading(true);
      const sessions = await loadSessions(selectedProject);
      if (sessionId) {
        await loadHistory(sessionId);
      } else if (sessions.length > 0) {
        navigate(`/chat/${selectedProject}/${sessions[0].id}`, { replace: true });
      }
      setLoading(false);
    };
    init();
  }, [selectedProject, sessionId, loadSessions, loadHistory, navigate]);

  return {
    projects,
    messages,
    setMessages,
    selectedProject,
    loading,
    error,
    setError,
    handleProjectChange,
    createSession,
  };
};

// Custom hook for model settings
const useModelSettings = () => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [chatHistoryCount, setChatHistoryCount] = useState<number>(10);
  const [useRag, setUseRag] = useState<boolean>(true);
  const [includeHistory, setIncludeHistory] = useState<boolean>(true);
  const [topK, setTopK] = useState<number>(10);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [systemPrompt, setSystemPrompt] = useState<string>('You are an AI coding assistant. Be helpful, concise, and provide clear explanations.');

  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await getAvailableModels();
        const models = res.data.chat_models || (res.data as any).models || [];
        setAvailableModels(models);
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0]);
        }
      } catch (err) {
        console.error('Failed to load models:', err);
      }
    };
    loadModels();
  }, [selectedModel]);

  return {
    selectedModel,
    setSelectedModel,
    availableModels,
    chatHistoryCount,
    setChatHistoryCount,
    useRag,
    setUseRag,
    includeHistory,
    setIncludeHistory,
    topK,
    setTopK,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    systemPrompt,
    setSystemPrompt,
  };
};

const Chat: React.FC = () => {
  const { projectId, sessionId } = useParams<{ projectId?: string; sessionId?: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State hooks
  const {
    projects,
    messages,
    setMessages,
    selectedProject,
    loading,
    error,
    setError,
    handleProjectChange,
    createSession,
  } = useChatState(projectId, sessionId);

  const {
    selectedModel,
    setSelectedModel,
    availableModels,
    chatHistoryCount,
    setChatHistoryCount,
    useRag,
    setUseRag,
    includeHistory,
    setIncludeHistory,
    topK,
    setTopK,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    systemPrompt,
    setSystemPrompt,
  } = useModelSettings();

  // Input and streaming state
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<string>('');
  const [streamingTokens, setStreamingTokens] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialSettings, setInitialSettings] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Load session settings when session changes
  useEffect(() => {
    if (!sessionId) return;
    
    const loadSettings = async () => {
      try {
        const res = await getChatSession(sessionId);
        const settings = res.data.session_settings || {};
        
        // Apply loaded settings
        if (settings.model) setSelectedModel(settings.model);
        if (settings.temperature !== undefined) setTemperature(settings.temperature);
        if (settings.max_tokens !== undefined) setMaxTokens(settings.max_tokens);
        if (settings.enable_rag !== undefined) setUseRag(settings.enable_rag);
        if (settings.top_k_config?.value !== undefined) setTopK(settings.top_k_config.value);
        if (settings.include_history !== undefined) setIncludeHistory(settings.include_history);
        if (settings.chat_history_count !== undefined) setChatHistoryCount(settings.chat_history_count);
        if (settings.system_prompt) setSystemPrompt(settings.system_prompt);
        
        // Store initial settings for change tracking
        const initialSettingsState = {
          model: settings.model || selectedModel,
          temperature: settings.temperature ?? temperature,
          max_tokens: settings.max_tokens ?? maxTokens,
          enable_rag: settings.enable_rag ?? useRag,
          top_k: settings.top_k_config?.value ?? topK,
          include_history: settings.include_history ?? includeHistory,
          chat_history_count: settings.chat_history_count ?? chatHistoryCount,
          system_prompt: settings.system_prompt || systemPrompt,
        };
        
        // Mark settings as loaded AFTER all setters are called
        // Use a small delay to ensure all state updates have been batched and processed
        setTimeout(() => {
          setInitialSettings(initialSettingsState);
          setSettingsLoaded(true);
          setHasUnsavedChanges(false);
          console.log('Settings loaded successfully');
        }, 100);
      } catch (err) {
        console.error('Failed to load session settings:', err);
        setSettingsLoaded(true); // Still mark as loaded to allow auto-save
      }
    };
    
    setSettingsLoaded(false); // Reset on session change
    setHasUnsavedChanges(false);
    loadSettings();
  }, [sessionId]);

  // Track settings changes
  useEffect(() => {
    if (!settingsLoaded || !initialSettings) return;
    
    const currentSettings = {
      model: selectedModel,
      temperature,
      max_tokens: maxTokens,
      enable_rag: useRag,
      top_k: topK,
      include_history: includeHistory,
      chat_history_count: chatHistoryCount,
      system_prompt: systemPrompt,
    };
    
    const hasChanges = JSON.stringify(currentSettings) !== JSON.stringify(initialSettings);
    setHasUnsavedChanges(hasChanges);
  }, [selectedModel, temperature, maxTokens, useRag, topK, includeHistory, chatHistoryCount, systemPrompt, settingsLoaded, initialSettings]);

  // Auto-save settings when they change
  useEffect(() => {
    console.log(`Auto-save effect: sessionId=${sessionId}, temp=${temperature}, loaded=${settingsLoaded}`);
    
    if (!sessionId) return;
    
    // Skip auto-save if settings haven't been loaded yet
    if (!settingsLoaded) {
      console.log('Skipping auto-save: settings not loaded yet');
      return;
    }
    
    const saveSettings = async () => {
      try {
        console.log(`Saving settings: temp=${temperature}`);
        const settingsToSave = {
          model: selectedModel,
          temperature,
          max_tokens: maxTokens,
          enable_rag: useRag,
          top_k_config: { mode: 'manual', value: topK },
          include_history: includeHistory,
          chat_history_count: chatHistoryCount,
          system_prompt: systemPrompt,
        };
        await updateSessionSettings(sessionId, settingsToSave);
        console.log('Auto-saved settings');
        
        // Update initial settings after successful save
        setInitialSettings({
          model: selectedModel,
          temperature,
          max_tokens: maxTokens,
          enable_rag: useRag,
          top_k: topK,
          include_history: includeHistory,
          chat_history_count: chatHistoryCount,
          system_prompt: systemPrompt,
        });
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Auto-save settings failed:', err);
      }
    };
    
    // Debounce the save
    const timer = setTimeout(saveSettings, 500);
    return () => clearTimeout(timer);
  }, [sessionId, selectedModel, temperature, maxTokens, useRag, topK, includeHistory, chatHistoryCount, systemPrompt, settingsLoaded]);

  // Manual save settings handler
  const handleSaveSettings = async () => {
    if (!sessionId) return;
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const settingsToSave = {
        model: selectedModel,
        temperature,
        max_tokens: maxTokens,
        enable_rag: useRag,
        top_k_config: { mode: 'manual', value: topK },
        include_history: includeHistory,
        chat_history_count: chatHistoryCount,
        system_prompt: systemPrompt,
      };
      await updateSessionSettings(sessionId, settingsToSave);
      
      // Update initial settings after successful save
      setInitialSettings({
        model: selectedModel,
        temperature,
        max_tokens: maxTokens,
        enable_rag: useRag,
        top_k: topK,
        include_history: includeHistory,
        chat_history_count: chatHistoryCount,
        system_prompt: systemPrompt,
      });
      setHasUnsavedChanges(false);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Copy handler
  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Stop generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setCurrentThinking('');
    setStreamingTokens(0);
  };

  // Regenerate handler - resend the last user message
  const handleRegenerate = async (messageId: string | number) => {
    if (isStreaming || !sessionId) return;
    
    // Find the assistant message and the preceding user message
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex < 1) return;
    
    // Find the last user message before this assistant message
    let userMsgIndex = msgIndex - 1;
    while (userMsgIndex >= 0 && messages[userMsgIndex].role !== 'user') {
      userMsgIndex--;
    }
    if (userMsgIndex < 0) return;
    
    const userMessage = messages[userMsgIndex];
    
    // Remove the assistant message
    setMessages(prev => prev.filter((_, idx) => idx !== msgIndex));
    
    // Set input and trigger send directly
    setInput(userMessage.content);
  };

  // Edit user message handler
  const handleEdit = async (messageId: string | number, newContent: string) => {
    if (isStreaming || !sessionId) return;
    
    // Find the message index
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex < 0) return;
    
    // Update the message content
    setMessages(prev => prev.map((m, idx) => 
      idx === msgIndex ? { ...m, content: newContent } : m
    ));
    
    // Remove all messages after this one and regenerate
    const messagesAfter = messages.slice(msgIndex + 1);
    if (messagesAfter.length > 0) {
      setMessages(prev => prev.slice(0, msgIndex + 1));
      
      // Trigger regeneration with the edited content
      setInput(newContent);
      setMessages(prev => prev.slice(0, msgIndex)); // Remove the edited message too, it will be re-added by handleSend
    }
  };

  // Send message with streaming support - handles both RAG and non-RAG modes
  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedProject || !sessionId) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsStreaming(true);
    setCurrentThinking('');
    setStreamingTokens(0);
    setError(null);

    const assistantMsgId = Date.now() + 1;
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      session_id: sessionId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Use streaming
    abortControllerRef.current = new AbortController();
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

    try {
      let response: Response;
      
      if (useRag) {
        // RAG mode - use /chat/project endpoint with project context
        response = await fetch(`${apiBase}/chat/project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: selectedProject,
            session_id: sessionId,
            message: userInput,
            include_history: includeHistory,
            top_k: topK,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        });
      } else {
        // Non-RAG mode - use /chat/chat/stream endpoint for direct chat
        // Build messages array with history if enabled
        const chatMessages: { role: string; content: string }[] = [];
        
        // Add system message for context
        chatMessages.push({
          role: 'system',
          content: systemPrompt || 'You are an AI coding assistant. You are having a conversation with a user about their project. Be helpful, concise, and provide clear explanations when discussing code or technical topics.'
        });
        
        // Add history if enabled
        if (includeHistory && messages.length > 0) {
          const historyMessages = messages.slice(-chatHistoryCount * 2); // Get last N message pairs
          for (const msg of historyMessages) {
            chatMessages.push({ role: msg.role, content: msg.content });
          }
        }
        
        // Add current user message
        chatMessages.push({ role: 'user', content: userInput });
        
        response = await fetch(`${apiBase}/chat/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: chatMessages,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || `HTTP error! status: ${response.status}`;
        
        // Special handling for timeout errors
        if (response.status === 504 || errorMsg.includes('timed out')) {
          throw new Error(`⏱️ Request timed out. ${errorMsg.includes('top_k') ? errorMsg : 'Try reducing the Top-K value or simplifying your query.'}`);
        }
        
        // Special handling for context size errors
        if (response.status === 413 || errorMsg.includes('Context size exceeded') || errorMsg.includes('exceeds the available context')) {
          throw new Error(`⚠️ ${errorMsg}`);
        }
        
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';
      let reasoning = ''; // Accumulated reasoning/thinking
      let fileRelevance: any[] = [];
      let buffer = ''; // Buffer for incomplete SSE data

      if (reader) {
        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Stream ended - finalize message
              setIsStreaming(false);
              setCurrentThinking(''); // Clear the streaming indicator
              const finalFileRelevance = fileRelevance;
              const finalReasoning = reasoning; // Keep the accumulated reasoning
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, isStreaming: false, file_relevance: finalFileRelevance, reasoning: finalReasoning, model: selectedModel }
                    : m
                )
              );
              break;
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Split on double newline (SSE event separator)
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep incomplete event in buffer

            for (const event of events) {
              if (!event.trim()) continue;
              
              // Parse SSE format: data: <content>
              const lines = event.split('\n');
              // eslint-disable-next-line no-loop-func
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);

                if (data === '[DONE]') {
                  setIsStreaming(false);
                  setCurrentThinking('');
                  const doneFileRelevance = fileRelevance;
                  const doneReasoning = reasoning;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, isStreaming: false, file_relevance: doneFileRelevance, reasoning: doneReasoning, model: selectedModel }
                        : m
                    )
                  );
                  continue;
                }

                // Handle [ERROR] format from non-RAG streaming
                if (data.startsWith('[ERROR]')) {
                  throw new Error(data.slice(8).trim());
                }

                // Try to parse as JSON (RAG mode structured response)
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'thinking' || parsed.type === 'reasoning') {
                    reasoning += parsed.content;
                    setCurrentThinking(reasoning); // Show accumulated reasoning during stream
                    // Update message with reasoning in real-time
                    setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, reasoning } : m)));
                  } else if (parsed.type === 'content') {
                    content += parsed.content;
                    const newContent = content;
                    // Update streaming token count based on content length (rough estimate)
                    setStreamingTokens(Math.floor(newContent.length / 4));
                    setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: newContent } : m)));
                  } else if (parsed.type === 'file_relevance') {
                    fileRelevance = parsed.file_relevance || [];
                    const newFileRelevance = fileRelevance;
                    setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, file_relevance: newFileRelevance } : m)));
                  } else if (parsed.type === 'stats') {
                    // Handle token statistics
                    const usage = parsed.usage;
                    if (usage) {
                      setStreamingTokens(usage.total_tokens);
                      setMessages((prev) => prev.map((m) => 
                        m.id === assistantMsgId 
                          ? { 
                              ...m, 
                              prompt_tokens: usage.prompt_tokens,
                              completion_tokens: usage.completion_tokens,
                              tokens_used: usage.total_tokens
                            } 
                          : m
                      ));
                    }
                  } else if (parsed.type === 'error') {
                    throw new Error(parsed.content);
                  }
                } catch (parseErr) {
                  // Not JSON - treat as raw text content (non-RAG streaming mode)
                  // The non-RAG endpoint streams raw text, not JSON
                  if (data && !data.startsWith('{') && !data.startsWith('[')) {
                    content += data;
                    const rawContent = content;
                    setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: rawContent } : m)));
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: m.content + '\n\n*[Generation stopped]*', isStreaming: false } : m
          )
        );
      } else {
        const errorMessage = err.message || 'Failed to send message';
        setError(errorMessage);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: `Error: ${errorMessage}`, isStreaming: false } : m))
        );
      }
      setIsStreaming(false);
      setCurrentThinking('');
      setStreamingTokens(0);
    }
  }, [input, selectedProject, sessionId, useRag, includeHistory, selectedModel, messages, chatHistoryCount, topK, systemPrompt, setMessages, setInput, setIsStreaming, setCurrentThinking, setStreamingTokens, setError]);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Main Chat Area */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        {/* Header - Two Rows */}
        <Paper elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          {/* Row 1: Settings and Buttons */}
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Project</InputLabel>
              <Select value={selectedProject || ''} onChange={(e) => handleProjectChange(e.target.value)} label="Project">
                {projects.map((p) => (<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Model</InputLabel>
              <Select value={selectedModel || ''} onChange={(e) => setSelectedModel(e.target.value)} label="Model" disabled={!availableModels.length}>
                {availableModels.map((m) => (<MenuItem key={m} value={m}>{m}</MenuItem>))}
              </Select>
            </FormControl>

            <Tooltip title="Temperature controls randomness (0=focused, 2=creative)">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>Temp:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <Typography variant="caption" fontWeight="medium">{temperature.toFixed(1)}</Typography>
                  <Box sx={{ width: 60 }}>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </Box>
                </Box>
              </Box>
            </Tooltip>

            <Tooltip title="Maximum tokens to generate">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 45 }}>Tokens:</Typography>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} sx={{ fontSize: '0.875rem', height: 32 }}>
                    {[512, 1024, 2048, 4096, 8192].map((n) => (<MenuItem key={n} value={n}>{n}</MenuItem>))}
                  </Select>
                </FormControl>
              </Box>
            </Tooltip>

            <Tooltip title={useRag ? "Using RAG - searches project codebase for context" : "Direct chat - no codebase context"}>
              <FormControlLabel
                control={<Switch checked={useRag} onChange={(e) => setUseRag(e.target.checked)} size="small" color="primary" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SearchIcon fontSize="small" />
                    <Typography variant="body2">RAG</Typography>
                  </Box>
                }
                sx={{ ml: 0.5 }}
              />
            </Tooltip>

            {useRag && (
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <InputLabel>Top-K</InputLabel>
                <Select value={topK} onChange={(e) => setTopK(Number(e.target.value))} label="Top-K">
                  {[5, 10, 25, 50, 100, 500].map((k) => (<MenuItem key={k} value={k}>{k}</MenuItem>))}
                </Select>
              </FormControl>
            )}

            <Tooltip title="Include previous messages for context">
              <FormControlLabel
                control={<Switch checked={includeHistory} onChange={(e) => setIncludeHistory(e.target.checked)} size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <HistoryIcon fontSize="small" />
                    <Typography variant="body2">Context</Typography>
                  </Box>
                }
              />
            </Tooltip>

            {includeHistory && (
              <FormControl size="small" sx={{ minWidth: 75 }}>
                <InputLabel>Msgs</InputLabel>
                <Select value={chatHistoryCount} onChange={(e) => setChatHistoryCount(Number(e.target.value))} label="Msgs">
                  {[5, 10, 20, 30, 50].map((n) => (<MenuItem key={n} value={n}>{n}</MenuItem>))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ flexGrow: 1 }} />

            {/* Manual Save Button - Only show when there are unsaved changes */}
            {hasUnsavedChanges && (
              <Tooltip title={settingsSaved ? "Settings saved!" : "Save all settings now"}>
                <Button
                  variant={settingsSaved ? "contained" : "outlined"}
                  color={settingsSaved ? "success" : "primary"}
                  startIcon={settingsSaved ? <CheckIcon /> : <SaveIcon />}
                  onClick={handleSaveSettings}
                  disabled={!sessionId || savingSettings}
                  size="small"
                  sx={{ minWidth: 90 }}
                >
                  {savingSettings ? 'Saving...' : settingsSaved ? 'Saved' : 'Save'}
                </Button>
              </Tooltip>
            )}
            
            <Button variant="outlined" startIcon={<AddIcon />} onClick={createSession} disabled={!selectedProject} size="small">
              New Chat
            </Button>
          </Box>

          {/* Row 2: System Prompt */}
          <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
            <Tooltip title="Edit system instructions for the AI">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50, whiteSpace: 'nowrap' }}>Prompt:</Typography>
                <TextField
                  size="small"
                  placeholder="System instructions..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  multiline
                  maxRows={4}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.875rem',
                      padding: '6px 10px',
                    },
                    '& .MuiInputBase-input': {
                      padding: '4px 0',
                    },
                  }}
                />
              </Box>
            </Tooltip>
          </Box>
        </Paper>

        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>{error}</Alert>}

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3, bgcolor: 'background.default' }}>
          {loading ? (
            <LoadingSpinner fullScreen message="Loading chat..." />
          ) : !selectedProject ? (
            <Box textAlign="center" mt={10}>
              <AIIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>Welcome to InfraMind AI Chat</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>Select a project to start chatting</Typography>
            </Box>
          ) : !sessionId ? (
            <Box textAlign="center" mt={10}>
              <AIIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>Ready to Chat</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                {useRag 
                  ? 'RAG mode: Your questions will search the project codebase for relevant context'
                  : 'Direct chat mode: General conversation without codebase context'
                }
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={createSession}>Start New Chat</Button>
            </Box>
          ) : messages.length === 0 ? (
            <Box textAlign="center" mt={10}>
              <AIIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {useRag ? 'Ask about your codebase' : 'Start a conversation'}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {useRag 
                  ? 'Try asking about specific files, functions, or how parts of your code work'
                  : 'Type a message below to start chatting'
                }
              </Typography>
            </Box>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                  currentReasoning={isStreaming && idx === messages.length - 1 ? currentThinking : ''}
                  onCopy={handleCopy}
                  onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined}
                  onEdit={msg.role === 'user' ? handleEdit : undefined}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>

        {/* Input */}
        <Paper elevation={0} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={handleStop}
            disabled={!sessionId || isStreaming}
            isStreaming={isStreaming}
            totalTokens={streamingTokens}
            placeholder={
              !selectedProject ? 'Select a project first' :
              !sessionId ? 'Start a new chat session' :
              useRag ? 'Ask about your codebase... (Shift+Enter for new line)' :
              'Type your message... (Shift+Enter for new line)'
            }
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default Chat;
