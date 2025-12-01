import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Project,
  Source,
  Job,
  ChatSession,
  ChatMessage,
  GitHubConfig,
  OpenWebUIConfig,
  ProcessingConfig,
  CacheStats,
  CacheConfig,
  EmbeddingConfig,
  DatabaseConfig,
  ChatPromptConfig,
  HealthStatus,
  ChatResponse,
} from '../types';

// API URL from environment or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minute timeout for long operations
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Request]', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Response]', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    console.error('[API Error]', {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// ==================== Health ====================
export const getHealth = (): Promise<AxiosResponse<HealthStatus>> => 
  api.get('/health');

export const getQuickHealth = (): Promise<AxiosResponse<{ status: string }>> => 
  api.get('/health/quick');

export const getDetailedHealth = (): Promise<AxiosResponse<HealthStatus>> => 
  api.get('/health/detailed');

// ==================== Projects ====================
export const getProjects = (skip = 0, limit = 50): Promise<AxiosResponse<{ projects: Project[]; total: number }>> =>
  api.get('/projects', { params: { skip, limit } });

export const getProject = (id: string): Promise<AxiosResponse<Project>> =>
  api.get(`/projects/${id}`);

export const createProject = (data: Partial<Project>): Promise<AxiosResponse<Project>> =>
  api.post('/projects', data);

export const updateProject = (id: string, data: Partial<Project>): Promise<AxiosResponse<Project>> =>
  api.put(`/projects/${id}`, data);

export const deleteProject = (id: string): Promise<AxiosResponse<void>> =>
  api.delete(`/projects/${id}`);

export const resetProject = (id: string): Promise<AxiosResponse<Project>> =>
  api.post(`/projects/${id}/reset`);

// ==================== Sources ====================
export const getSources = (projectId: string): Promise<AxiosResponse<{ sources: Source[] }>> =>
  api.get(`/projects/${projectId}/sources`);

export const getSource = (sourceId: string): Promise<AxiosResponse<Source>> =>
  api.get(`/projects/sources/${sourceId}`);

export const createSource = (projectId: string, data: Partial<Source>): Promise<AxiosResponse<Source>> =>
  api.post(`/projects/${projectId}/sources`, data);

export const updateSource = (sourceId: string, data: Partial<Source>): Promise<AxiosResponse<Source>> =>
  api.put(`/projects/sources/${sourceId}`, data);

export const deleteSource = (sourceId: string): Promise<AxiosResponse<void>> =>
  api.delete(`/projects/sources/${sourceId}`);

export const resetSourceProcessing = (sourceId: string): Promise<AxiosResponse<Source>> =>
  api.post(`/projects/sources/${sourceId}/reset-processing`);

export const getBranches = (sourceId: string): Promise<AxiosResponse<{ branches: string[] }>> =>
  api.get(`/projects/sources/${sourceId}/branches`);

export const getSourceFiles = (sourceId: string, skip = 0, limit = 500): Promise<AxiosResponse<any>> =>
  api.get(`/projects/sources/${sourceId}/files`, { params: { skip, limit } });

export const reSyncSource = (sourceId: string): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.post(`/projects/sources/${sourceId}/re-sync`);

export const reProcessSource = (sourceId: string): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.post(`/projects/sources/${sourceId}/re-process`);

export const reEmbedSource = (sourceId: string): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.post(`/projects/sources/${sourceId}/re-embed`);

// ==================== Jobs ====================
export const getJobs = (params?: {
  source_id?: string;
  project_id?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<AxiosResponse<{ jobs: Job[]; total: number }>> =>
  api.get('/jobs', { params });

export const getJob = (jobId: string): Promise<AxiosResponse<Job>> =>
  api.get(`/jobs/${jobId}`);

export const createJob = (data: {
  job_type: string;
  project_id?: string;
  source_id?: string;
  config?: any;
}): Promise<AxiosResponse<Job>> =>
  api.post('/jobs', data);

export const pauseJob = (jobId: string): Promise<AxiosResponse<Job>> =>
  api.post(`/jobs/${jobId}/pause`);

export const resumeJob = (jobId: string): Promise<AxiosResponse<Job>> =>
  api.post(`/jobs/${jobId}/resume`);

export const cancelJob = (jobId: string): Promise<AxiosResponse<Job>> =>
  api.post(`/jobs/${jobId}/cancel`);

export const restartJob = (jobId: string): Promise<AxiosResponse<Job>> =>
  api.post(`/jobs/${jobId}/restart`);

export const deleteJob = (jobId: string): Promise<AxiosResponse<void>> =>
  api.delete(`/jobs/${jobId}`);

// Job logs streaming
export const getJobLogsUrl = (jobId: string): string =>
  `${API_URL}/jobs/${jobId}/logs`;

// ==================== Chat ====================
export const getChatSessions = (projectId: string): Promise<AxiosResponse<{ sessions: ChatSession[]; total: number }>> =>
  api.get('/chat/sessions', { params: { project_id: projectId } });

export const createChatSession = (projectId: string, name?: string): Promise<AxiosResponse<ChatSession>> =>
  api.post('/chat/sessions', { project_id: projectId, name: name || 'New Chat' });

export const getChatSession = (sessionId: string): Promise<AxiosResponse<ChatSession>> =>
  api.get(`/chat/sessions/${sessionId}`);

export const getChatHistory = (sessionId: string): Promise<AxiosResponse<{ session_id: string; messages: ChatMessage[]; total: number }>> =>
  api.get(`/chat/sessions/${sessionId}/history`);

export const updateSessionSettings = (sessionId: string, settings: {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  enable_rag?: boolean;
  top_k_config?: any;
  include_history?: boolean;
  system_prompt?: string;
}): Promise<AxiosResponse<ChatSession>> =>
  api.patch(`/chat/sessions/${sessionId}/settings`, settings);

export const deleteChatSession = (sessionId: string): Promise<AxiosResponse<{ success: boolean }>> =>
  api.delete(`/chat/sessions/${sessionId}`);

export const sendChatMessage = (data: {
  project_id: string;
  session_id: string;
  message: string;
  model?: string;
  use_rag?: boolean;
  include_history?: boolean;
  top_k?: number;
  chat_history_count?: number;
  stream?: boolean;
}): Promise<AxiosResponse<ChatResponse>> =>
  api.post('/chat/project', data);

// Streaming chat endpoint
export const getChatStreamUrl = (): string =>
  `${API_URL}/chat/project`;

export const stopChat = (messageId: string): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.post('/chat/stop', { message_id: messageId });

export const regenerateMessage = (data: {
  session_id: string;
  message_id: string;
  temperature?: number;
}): Promise<AxiosResponse<ChatResponse>> =>
  api.post('/chat/regenerate', data);

export const editMessage = (data: {
  session_id: string;
  message_id: string;
  new_content: string;
  regenerate?: boolean;
}): Promise<AxiosResponse<ChatResponse>> =>
  api.post('/chat/edit', data);

export const getFileContent = (projectId: string, filePath: string): Promise<AxiosResponse<any>> =>
  api.get(`/chat/project/${projectId}/file/${encodeURIComponent(filePath)}`);

// Direct Chat Completion (without RAG)
export const chatCompletion = (data: {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}): Promise<AxiosResponse<ChatResponse>> =>
  api.post('/chat/chat', data);

export const getChatCompletionStreamUrl = (): string =>
  `${API_URL}/chat/chat/stream`;

// Embedding generation
export const generateEmbedding = (text: string): Promise<AxiosResponse<{ embedding: number[]; dimension: number; model: string }>> =>
  api.post('/chat/embed', { text });

export const generateEmbeddingsBatch = (texts: string[]): Promise<AxiosResponse<{ embeddings: number[][]; count: number; dimension: number; model: string }>> =>
  api.post('/chat/embed/batch', { texts });

// Chat Prompts
export const getChatPrompts = (projectId?: string): Promise<AxiosResponse<{ configs: ChatPromptConfig[]; total: number }>> =>
  api.get('/chat/prompts', { params: projectId ? { project_id: projectId } : {} });

export const getChatPrompt = (promptId: string): Promise<AxiosResponse<ChatPromptConfig>> =>
  api.get(`/chat/prompts/${promptId}`);

export const createChatPrompt = (data: Partial<ChatPromptConfig>): Promise<AxiosResponse<ChatPromptConfig>> =>
  api.post('/chat/prompts', data);

export const updateChatPrompt = (promptId: string, data: Partial<ChatPromptConfig>): Promise<AxiosResponse<ChatPromptConfig>> =>
  api.put(`/chat/prompts/${promptId}`, data);

export const deleteChatPrompt = (promptId: string): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.delete(`/chat/prompts/${promptId}`);

export const resetChatPrompt = (promptId: string): Promise<AxiosResponse<ChatPromptConfig>> =>
  api.post(`/chat/prompts/${promptId}/reset`);

// ==================== Settings - GitHub ====================
export const getGitHubConfigs = (): Promise<AxiosResponse<{ configs: GitHubConfig[] }>> =>
  api.get('/settings/github');

export const getGitHubConfig = (id: string): Promise<AxiosResponse<GitHubConfig>> =>
  api.get(`/settings/github/${id}`);

export const createGitHubConfig = (data: Partial<GitHubConfig> & { pat_token?: string }): Promise<AxiosResponse<GitHubConfig>> =>
  api.post('/settings/github', data);

export const updateGitHubConfig = (id: string, data: Partial<GitHubConfig> & { pat_token?: string }): Promise<AxiosResponse<GitHubConfig>> =>
  api.put(`/settings/github/${id}`, data);

export const deleteGitHubConfig = (id: string): Promise<AxiosResponse<void>> =>
  api.delete(`/settings/github/${id}`);

export const setDefaultGitHubConfig = (id: string): Promise<AxiosResponse<GitHubConfig>> =>
  api.post(`/settings/github/${id}/set-default`);

export const testGitHubConfig = (id: string): Promise<AxiosResponse<{ success: boolean; message: string; user?: { login: string; name: string; email: string }; error?: string }>> =>
  api.post(`/settings/github/${id}/test`);

// ==================== Settings - OpenWebUI ====================
export const getOpenWebUIConfigs = (): Promise<AxiosResponse<{ configs: OpenWebUIConfig[] }>> =>
  api.get('/settings/openwebui');

export const getOpenWebUIConfig = (id: string): Promise<AxiosResponse<OpenWebUIConfig>> =>
  api.get(`/settings/openwebui/${id}`);

export const createOpenWebUIConfig = (data: Partial<OpenWebUIConfig> & { api_key?: string }): Promise<AxiosResponse<OpenWebUIConfig>> =>
  api.post('/settings/openwebui', data);

export const updateOpenWebUIConfig = (id: string, data: Partial<OpenWebUIConfig> & { api_key?: string }): Promise<AxiosResponse<OpenWebUIConfig>> =>
  api.put(`/settings/openwebui/${id}`, data);

export const deleteOpenWebUIConfig = (id: string): Promise<AxiosResponse<void>> =>
  api.delete(`/settings/openwebui/${id}`);

export const setDefaultOpenWebUIConfig = (id: string): Promise<AxiosResponse<OpenWebUIConfig>> =>
  api.post(`/settings/openwebui/${id}/set-default`);

export const testOpenWebUIConfig = (id: string): Promise<AxiosResponse<{ success: boolean; message: string; models?: { chat_models: string[]; embedding_models: string[] } }>> =>
  api.post(`/settings/openwebui/${id}/test`);

export const getAvailableModels = (): Promise<AxiosResponse<{ chat_models: string[]; embedding_models: string[] }>> =>
  api.get('/settings/openwebui/models/available');

// ==================== Settings - Cache ====================
export const getCacheStats = (): Promise<AxiosResponse<CacheStats>> =>
  api.get('/settings/cache/stats');

export const clearEmbeddingCache = (): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.post('/settings/cache/clear/embeddings');

export const clearAllCache = (): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.post('/settings/cache/clear/all');

export const getCacheConfig = (): Promise<AxiosResponse<CacheConfig>> =>
  api.get('/settings/cache/config');

export const updateCacheConfig = (data: Partial<CacheConfig>): Promise<AxiosResponse<CacheConfig>> =>
  api.put('/settings/cache/config', data);

export const resetCacheConfig = (): Promise<AxiosResponse<CacheConfig>> =>
  api.post('/settings/cache/config/reset');

// ==================== Settings - Processing ====================
export const getProcessingConfig = (): Promise<AxiosResponse<ProcessingConfig>> =>
  api.get('/settings/processing/config');

export const updateProcessingConfig = (data: Partial<ProcessingConfig>): Promise<AxiosResponse<ProcessingConfig>> =>
  api.put('/settings/processing/config', data);

export const resetProcessingConfig = (): Promise<AxiosResponse<ProcessingConfig>> =>
  api.post('/settings/processing/config/reset');

// ==================== Settings - Embedding ====================
export const getEmbeddingSettings = (): Promise<AxiosResponse<EmbeddingConfig>> =>
  api.get('/settings/embedding/config');

export const updateEmbeddingSettings = (data: Partial<EmbeddingConfig>): Promise<AxiosResponse<EmbeddingConfig>> =>
  api.put('/settings/embedding/config', data);

export const resetEmbeddingSettings = (): Promise<AxiosResponse<EmbeddingConfig>> =>
  api.post('/settings/embedding/config/reset');

// ==================== Settings - Database ====================
export const getDatabaseInfo = (): Promise<AxiosResponse<DatabaseConfig>> =>
  api.get('/settings/database/config');

export const updateDatabaseConfig = (data: Partial<DatabaseConfig>): Promise<AxiosResponse<DatabaseConfig>> =>
  api.put('/settings/database/config', data);

export const resetDatabase = (target: 'redis' | 'milvus' | 'postgres' | 'all' = 'all'): Promise<AxiosResponse<{ success: boolean; message?: string; database?: string }>> =>
  api.post(`/settings/database/reset/${target}`);

export const dropDatabase = (target: 'redis' | 'milvus' | 'postgres' | 'all' = 'all'): Promise<AxiosResponse<{ success: boolean; message?: string; database?: string }>> =>
  api.post(`/settings/database/drop/${target}`);

export default api;
