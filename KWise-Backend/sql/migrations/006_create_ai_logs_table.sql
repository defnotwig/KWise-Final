-- AI Logs Table for tracking AI interactions
-- Phase 2 - Fix database logging error

CREATE TABLE IF NOT EXISTS ai_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  prompt TEXT,
  response JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_execution_time CHECK (execution_time_ms >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_endpoint ON ai_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_execution_time ON ai_logs(execution_time_ms);

-- Comment on table
COMMENT ON TABLE ai_logs IS 'Tracks all AI service interactions for analytics and debugging';
COMMENT ON COLUMN ai_logs.endpoint IS 'API endpoint that triggered the AI interaction';
COMMENT ON COLUMN ai_logs.prompt IS 'Input prompt sent to AI service';
COMMENT ON COLUMN ai_logs.response IS 'JSONB response from AI service';
COMMENT ON COLUMN ai_logs.execution_time_ms IS 'Execution time in milliseconds';

-- Grant permissions (adjust as needed for your user)
GRANT SELECT, INSERT ON ai_logs TO postgres;
GRANT USAGE, SELECT ON SEQUENCE ai_logs_id_seq TO postgres;
