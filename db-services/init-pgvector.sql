-- Initialize PgVector extension for InfraMind-AI
-- This script runs automatically when the PostgreSQL container starts

-- Create vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
