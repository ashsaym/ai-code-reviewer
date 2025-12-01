// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  milvus_collection?: string;
  github_config_id?: string;
  openwebui_config_id?: string;
  source_count?: number;
  total_files?: number;
  total_chunks?: number;
  created_at: string;
  updated_at: string;
}

// Source types
export interface Source {
  id: string;
  project_id: string;
  name: string;
  source_type: string;
  repo_url: string;
  branch: string;
  status?: string;
  include_patterns?: string[];
  exclude_patterns?: string[];
  exclude_folders?: string[];
  text_extensions?: string[];
  binary_extensions?: string[];
  total_files?: number;
  processed_files?: number;
  total_chunks?: number;
  last_synced?: string;
  last_sync_at?: string;
  last_commit_sha?: string;
  sync_error?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

// Job types
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type JobType = 'sync' | 'embed' | 'full_process';

export interface Job {
  id: string;
  project_id?: string;
  source_id?: string;
  job_type: string;
  status: JobStatus;
  progress_percent: number;
  total_items?: number;
  processed_items?: number;
  failed_items?: number;
  current_item?: string;
  result?: any;
  error_message?: string;
  message?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  created_at: string;
  config?: any;
}

export interface JobLog {
  id: string;
  job_id: string;
  level: string;
  message: string;
  details?: any;
  created_at: string;
}

// Chat types
export interface ChatSession {
  id: string;
  project_id?: string;
  name?: string;
  title?: string;
  session_settings?: Record<string, any>;
  message_count?: number;
  created_at: string;
  updated_at: string;
}

export interface FileRelevance {
  file_path: string;
  file_name: string;
  relevance_percent: number;
  chunk_count: number;
  snippet?: string;
  chunk_ids?: string[];
}

export interface ChatMessage {
  id: string | number;
  session_id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  thinking?: string;
  sources?: FileRelevance[];
  file_relevance?: FileRelevance[];
  tokens_used?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  tokens_per_second?: number;
  model?: string;
  metadata?: Record<string, any>;
  created_at: string;
  isStreaming?: boolean;
}

export interface ChatResponse {
  content: string;
  session_id: string;
  message_id: string;
  has_context: boolean;
  contexts: any[];
  file_relevance: FileRelevance[];
  model: string;
  top_k_used?: number;
  total_indexed_chunks?: number;
  tokens_used?: number;
}

// Settings types
export interface GitHubConfig {
  id: string;
  name: string;
  host: string;
  username?: string;
  pat_token_masked?: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OpenWebUIConfig {
  id: string;
  name: string;
  api_url: string;
  api_key_masked?: string;
  default_chat_model?: string;
  default_embedding_model?: string;
  default_reranker_model?: string;
  is_default: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProcessingConfig {
  id?: string;
  default_batch_size: number;
  max_concurrent: number;
  max_parallel_files: number;
  max_files_per_batch: number;
  max_documents_per_batch: number;
  max_chunk_size: number;
  chunk_overlap: number;
  max_document_size_mb: number;
  parallel_chunks: number;
  embedding_batch_size: number;
  max_concurrent_requests: number;
  requests_per_minute: number;
  tokens_per_minute: number;
  max_retries: number;
  retry_delay_seconds: number;
  created_at?: string;
  updated_at?: string;
}

export interface CacheStats {
  status: string;
  embedding_cache_size: number;
  general_cache_size: number;
  total_keys: number;
  memory_used: string;
  counters: Record<string, number>;
}

// Cache Config types
export interface CacheConfig {
  id?: string;
  enabled: boolean;
  ttl_seconds: number;
  embedding_ttl_seconds: number;
  max_cache_size_mb: number;
  created_at?: string;
  updated_at?: string;
}

// Embedding Config types
export interface EmbeddingConfig {
  id?: string;
  model_name: string;
  dimension: number;
  context_size: number;
  batch_size: number;
  max_concurrent_requests: number;
  created_at?: string;
  updated_at?: string;
}

// Database Config types
export interface DatabaseConfig {
  id?: string;
  postgres_host: string;
  postgres_port: number;
  postgres_db: string;
  redis_host: string;
  redis_port: number;
  milvus_host: string;
  milvus_port: number;
  created_at?: string;
  updated_at?: string;
}

// Chat Prompt Config types
export interface ChatPromptConfig {
  id?: string;
  project_id?: string;
  name: string;
  system_prompt: string;
  no_data_response: string;
  file_relevance_format: string;
  include_file_relevance: boolean;
  max_context_chunks: number;
  min_relevance_threshold: number;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Health types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'healthy_with_warnings';
  databases?: {
    postgres: boolean;
    redis: boolean;
    milvus: boolean;
  };
  services?: {
    postgres?: {
      status: string;
      host?: string;
      port?: number;
    };
    redis?: {
      status: string;
      host?: string;
      port?: number;
    };
    milvus?: {
      status: string;
      host?: string;
      port?: number;
      version?: string;
    };
  };
  uptime_seconds?: number;
  version?: string;
  timestamp?: string;
  issues?: string[];
  recommendations?: string[];
  configuration?: {
    cache_enabled?: boolean;
    debug_mode?: boolean;
    openweb_api_key_set?: boolean;
    github_pat_set?: boolean;
  };
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Error types
export interface ApiError {
  error: string;
  error_code?: string;
  details?: any;
  resolution?: string;
}
