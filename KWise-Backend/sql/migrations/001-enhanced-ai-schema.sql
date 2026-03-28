-- =====================================================
-- ENHANCED AI SCHEMA - PHASE 1: FOUNDATION
-- =====================================================
-- Comprehensive database enhancements for intelligent AI system
-- Implements: compatibility_logs, ai_feedback, ai_audit_logs, 
--            ai_recommendations, extended_metadata, upgrade_paths,
--            reference_builds, user_personas, ai_metrics
-- =====================================================
-- Author: K-Wise AI Integration Team
-- Date: 2025-10-31
-- Version: 1.0.0
-- =====================================================

BEGIN;

-- =====================================================
-- 1. COMPATIBILITY LOGS TABLE
-- =====================================================
-- Tracks every compatibility check with outcomes for pattern mining
CREATE TABLE IF NOT EXISTS compatibility_logs (
  id SERIAL PRIMARY KEY,
  build_hash VARCHAR(64) NOT NULL,
  parts_json JSONB NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Verdict tracking
  rules_verdict JSONB NOT NULL, -- Deterministic rule results
  ai_verdict JSONB, -- AI recommendation results
  user_decision VARCHAR(32) CHECK (user_decision IN ('accepted', 'rejected', 'modified', 'pending')),
  admin_override BOOLEAN DEFAULT FALSE,
  admin_override_reason TEXT,
  
  -- Outcome quality
  outcome_quality VARCHAR(32) CHECK (outcome_quality IN ('success', 'compatibility_issue', 'user_returned', 'unknown')),
  outcome_notes TEXT,
  
  -- User context at time of check
  user_context JSONB, -- Stores persona, budget, use_case, etc.
  
  -- Metadata
  session_id VARCHAR(64),
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compatibility_logs_build_hash ON compatibility_logs(build_hash);
CREATE INDEX IF NOT EXISTS idx_compatibility_logs_user_id ON compatibility_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_logs_outcome ON compatibility_logs(outcome_quality);
CREATE INDEX IF NOT EXISTS idx_compatibility_logs_created ON compatibility_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compatibility_logs_parts_gin ON compatibility_logs USING GIN (parts_json);

COMMENT ON TABLE compatibility_logs IS 'Historical compatibility check outcomes for pattern mining and AI training';

-- =====================================================
-- 2. AI RECOMMENDATIONS TABLE
-- =====================================================
-- Stores all AI-generated recommendations with confidence tracking
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id SERIAL PRIMARY KEY,
  scenario VARCHAR(64) NOT NULL CHECK (scenario IN ('compatibility', 'upgrade', 'reference_build', 'diagnostic', 'cleaning', 'future_upgrade')),
  
  -- Request context
  request_hash VARCHAR(64) NOT NULL,
  request_data JSONB NOT NULL,
  user_context JSONB,
  
  -- AI response
  ai_response JSONB NOT NULL,
  confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  source VARCHAR(32) CHECK (source IN ('ai', 'cache', 'fallback')),
  
  -- Performance metrics
  latency_ms INTEGER,
  model VARCHAR(64),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  
  -- Outcome tracking
  user_accepted BOOLEAN,
  user_feedback TEXT,
  admin_validated BOOLEAN,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_scenario ON ai_recommendations(scenario);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_hash ON ai_recommendations(request_hash);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_confidence ON ai_recommendations(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created ON ai_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_source ON ai_recommendations(source);

COMMENT ON TABLE ai_recommendations IS 'All AI-generated recommendations with performance and outcome tracking';

-- =====================================================
-- 3. AI FEEDBACK TABLE
-- =====================================================
-- Admin feedback on AI recommendations for continuous learning
CREATE TABLE IF NOT EXISTS ai_feedback (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER REFERENCES ai_recommendations(id) ON DELETE CASCADE,
  compatibility_log_id INTEGER REFERENCES compatibility_logs(id) ON DELETE CASCADE,
  
  -- Feedback details
  accurate VARCHAR(32) NOT NULL CHECK (accurate IN ('true', 'partially', 'false')),
  category VARCHAR(64) NOT NULL CHECK (category IN ('compatibility', 'upgrade', 'reference_build', 'diagnostic', 'cleaning')),
  
  -- Specific issues
  specific_issues JSONB, -- Array of issue types: understated_risk, overstated_risk, etc.
  corrected_recommendation TEXT,
  admin_notes TEXT,
  
  -- Admin info
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_recommendation ON ai_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_category ON ai_feedback(category);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_accurate ON ai_feedback(accurate);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_reviewed ON ai_feedback(reviewed_at DESC);

COMMENT ON TABLE ai_feedback IS 'Admin reviews of AI recommendations for quality improvement';

-- =====================================================
-- 4. AI AUDIT LOGS TABLE

-- =====================================================
-- 3. AI RECOMMENDATIONS TABLE (Enhanced)
-- =====================================================
-- Stores all AI-generated recommendations with confidence tracking
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id SERIAL PRIMARY KEY,
  scenario VARCHAR(64) NOT NULL CHECK (scenario IN ('compatibility', 'upgrade', 'reference_build', 'diagnostic', 'cleaning', 'future_upgrade')),
  
  -- Request context
  request_hash VARCHAR(64) NOT NULL,
  request_data JSONB NOT NULL,
  user_context JSONB,
  
  -- Response
  ai_output JSONB NOT NULL,
  confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT,
  
  -- Model info
  model_name VARCHAR(128) NOT NULL,
  model_version VARCHAR(64),
  prompt_template VARCHAR(128),
  prompt_tokens INTEGER,
  response_tokens INTEGER,
  
  -- Performance metrics
  latency_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  
  -- Quality tracking
  feedback_score NUMERIC(3,2), -- Updated from ai_feedback
  times_used INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_scenario ON ai_recommendations(scenario);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_hash ON ai_recommendations(request_hash);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created ON ai_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_confidence ON ai_recommendations(confidence DESC);

COMMENT ON TABLE ai_recommendations IS 'Stores all AI recommendations with performance and quality metrics';

-- =====================================================
-- 4. AI AUDIT LOGS TABLE
-- =====================================================
-- Complete audit trail of all AI decisions
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER REFERENCES ai_recommendations(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(64) NOT NULL CHECK (event_type IN ('recommendation_generated', 'recommendation_used', 'feedback_submitted', 'admin_override', 'experiment_variant', 'circuit_breaker')),
  event_data JSONB,
  
  -- Context
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  ip_address INET,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_recommendation ON ai_audit_logs(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_event_type ON ai_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created ON ai_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user ON ai_audit_logs(user_id);

COMMENT ON TABLE ai_audit_logs IS 'Complete audit trail of AI system events for compliance and analysis';

-- =====================================================
-- 5. EXTENDED PART METADATA
-- =====================================================
-- Enhance pc_parts table with rich metadata for AI context
ALTER TABLE pc_parts ADD COLUMN IF NOT EXISTS extended_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_pc_parts_extended_metadata ON pc_parts USING GIN (extended_metadata);

COMMENT ON COLUMN pc_parts.extended_metadata IS 'Rich metadata for AI: VRM requirements, thermal characteristics, known issues, performance profiles, compatibility notes';

-- =====================================================
-- 6. UPGRADE PATHS TABLE
-- =====================================================
-- Stores curated upgrade pathways
CREATE TABLE IF NOT EXISTS upgrade_paths (
  id SERIAL PRIMARY KEY,
  path_name VARCHAR(255) NOT NULL,
  from_build_category VARCHAR(64) NOT NULL, -- budget, mid-range, high-end
  to_build_category VARCHAR(64) NOT NULL,
  
  -- Upgrade details
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  estimated_performance_gain NUMERIC(5,2), -- Percentage
  estimated_cost_min NUMERIC(10,2),
  estimated_cost_max NUMERIC(10,2),
  
  -- Pathway steps
  upgrade_steps JSONB NOT NULL, -- Array of upgrade components in order
  timeline_months INTEGER,
  
  -- Metadata
  use_cases JSONB, -- Array: ['gaming', 'content_creation', etc.]
  popularity_score INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_upgrade_paths_from_category ON upgrade_paths(from_build_category);
CREATE INDEX IF NOT EXISTS idx_upgrade_paths_to_category ON upgrade_paths(to_build_category);
CREATE INDEX IF NOT EXISTS idx_upgrade_paths_priority ON upgrade_paths(priority DESC);
CREATE INDEX IF NOT EXISTS idx_upgrade_paths_active ON upgrade_paths(is_active);

COMMENT ON TABLE upgrade_paths IS 'Curated upgrade pathways with performance and cost estimates';

-- =====================================================
-- 7. REFERENCE BUILDS TABLE
-- =====================================================
-- Stores curated reference PC builds
CREATE TABLE IF NOT EXISTS reference_builds (
  id SERIAL PRIMARY KEY,
  build_name VARCHAR(255) NOT NULL,
  build_description TEXT,
  
  -- Build classification
  category VARCHAR(64) NOT NULL CHECK (category IN ('budget', 'mid-range', 'high-end', 'enthusiast', 'workstation')),
  use_cases JSONB NOT NULL, -- Array: ['gaming_1080p', 'video_editing_4k', etc.]
  
  -- Components
  components JSONB NOT NULL, -- Map of category -> product_id
  
  -- Specifications
  total_cost NUMERIC(10,2) NOT NULL,
  estimated_power_draw INTEGER,
  performance_tier VARCHAR(64),
  
  -- Performance benchmarks
  benchmarks JSONB, -- Gaming FPS, render times, etc.
  
  -- Metadata
  popularity_score INTEGER DEFAULT 0,
  times_recommended INTEGER DEFAULT 0,
  satisfaction_rating NUMERIC(3,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reference_builds_category ON reference_builds(category);
CREATE INDEX IF NOT EXISTS idx_reference_builds_cost ON reference_builds(total_cost);
CREATE INDEX IF NOT EXISTS idx_reference_builds_active ON reference_builds(is_active);
CREATE INDEX IF NOT EXISTS idx_reference_builds_featured ON reference_builds(featured);
CREATE INDEX IF NOT EXISTS idx_reference_builds_popularity ON reference_builds(popularity_score DESC);

COMMENT ON TABLE reference_builds IS 'Curated PC build configurations with performance metrics';

-- =====================================================
-- 8. USER PERSONAS TABLE
-- =====================================================
-- Stores user behavior profiles for personalized recommendations
CREATE TABLE IF NOT EXISTS user_personas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Persona classification
  persona_cluster VARCHAR(64) CHECK (persona_cluster IN ('competitive_gamer', 'content_creator_pro', 'budget_optimizer', 'enthusiast_overclocker', 'general_user')),
  confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Explicit preferences
  primary_use JSONB, -- Array: ['gaming', 'streaming', etc.]
  performance_target VARCHAR(128),
  budget_min NUMERIC(10,2),
  budget_max NUMERIC(10,2),
  budget_flexibility VARCHAR(32) CHECK (budget_flexibility IN ('strict', 'moderate', 'flexible')),
  
  -- Brand preferences
  brand_preferences JSONB,
  brand_avoid JSONB,
  
  -- Style preferences
  aesthetic VARCHAR(64) CHECK (aesthetic IN ('rgb_heavy', 'minimalist', 'professional', 'any')),
  noise_tolerance VARCHAR(32) CHECK (noise_tolerance IN ('silent', 'quiet', 'balanced', 'performance')),
  form_factor VARCHAR(32) CHECK (form_factor IN ('atx', 'matx', 'itx', 'any')),
  
  -- Implicit behavioral signals
  browsing_patterns JSONB,
  price_sensitivity VARCHAR(32),
  research_depth VARCHAR(32),
  
  -- Historical data
  previous_builds JSONB,
  upgrade_frequency_months INTEGER,
  
  -- Technical proficiency
  experience_level VARCHAR(32) CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  comfort_with JSONB, -- Array: ['overclocking', 'custom_cooling', etc.]
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_personas_user_id ON user_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personas_cluster ON user_personas(persona_cluster);
CREATE INDEX IF NOT EXISTS idx_user_personas_updated ON user_personas(updated_at DESC);

COMMENT ON TABLE user_personas IS 'User behavioral profiles for AI personalization';

-- =====================================================
-- 9. AI METRICS TABLE
-- =====================================================
-- Tracks AI system performance metrics
CREATE TABLE IF NOT EXISTS ai_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scenario VARCHAR(64) NOT NULL,
  
  -- Performance metrics
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  fallback_usage INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  
  -- Latency metrics (in milliseconds)
  avg_latency INTEGER,
  p50_latency INTEGER,
  p95_latency INTEGER,
  p99_latency INTEGER,
  max_latency INTEGER,
  
  -- Quality metrics
  avg_confidence NUMERIC(5,2),
  feedback_count INTEGER DEFAULT 0,
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,
  
  -- Circuit breaker events
  circuit_breaker_opens INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(metric_date, scenario)
);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_date ON ai_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_scenario ON ai_metrics(scenario);

COMMENT ON TABLE ai_metrics IS 'Daily aggregated AI system performance metrics';

-- =====================================================
-- 10. COMPATIBILITY RULES CONFIDENCE TABLE
-- =====================================================
-- Tracks confidence scores for deterministic rules
CREATE TABLE IF NOT EXISTS compatibility_rules_confidence (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(128) NOT NULL,
  rule_category VARCHAR(64) NOT NULL,
  
  -- Performance tracking
  times_executed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_incorrect INTEGER DEFAULT 0,
  false_positive_rate NUMERIC(5,4),
  false_negative_rate NUMERIC(5,4),
  
  -- Confidence scoring
  base_confidence NUMERIC(5,2) DEFAULT 100,
  adjusted_confidence NUMERIC(5,2) DEFAULT 100,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(rule_name)
);

CREATE INDEX IF NOT EXISTS idx_compatibility_rules_category ON compatibility_rules_confidence(rule_category);
CREATE INDEX IF NOT EXISTS idx_compatibility_rules_confidence_score ON compatibility_rules_confidence(adjusted_confidence DESC);

COMMENT ON TABLE compatibility_rules_confidence IS 'Confidence tracking for deterministic compatibility rules';

-- =====================================================
-- 11. AI EXPERIMENT VARIANTS TABLE
-- =====================================================
-- A/B testing framework for prompt variations
CREATE TABLE IF NOT EXISTS ai_experiment_variants (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(128) NOT NULL,
  experiment_name VARCHAR(255) NOT NULL,
  variant_id VARCHAR(64) NOT NULL,
  variant_name VARCHAR(255) NOT NULL,
  
  -- Variant configuration
  prompt_modifier JSONB NOT NULL,
  allocation_weight NUMERIC(5,2) DEFAULT 50,
  
  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  avg_confidence NUMERIC(5,2),
  avg_feedback_score NUMERIC(3,2),
  
  -- Experiment lifecycle
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  is_winner BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(experiment_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_experiments_id ON ai_experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ai_experiments_active ON ai_experiment_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_experiments_winner ON ai_experiment_variants(is_winner);

COMMENT ON TABLE ai_experiment_variants IS 'A/B testing framework for AI prompt optimization';

-- =====================================================
-- 12. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_compatibility_logs_updated_at BEFORE UPDATE ON compatibility_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upgrade_paths_updated_at BEFORE UPDATE ON upgrade_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reference_builds_updated_at BEFORE UPDATE ON reference_builds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_personas_updated_at BEFORE UPDATE ON user_personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_metrics_updated_at BEFORE UPDATE ON ai_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup old compatibility logs
CREATE OR REPLACE FUNCTION cleanup_old_compatibility_logs(months_to_keep INTEGER DEFAULT 6)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM compatibility_logs 
  WHERE created_at < NOW() - (months_to_keep || ' months')::INTERVAL
    AND outcome_quality IS NOT NULL; -- Keep logs with unknown outcomes
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate daily AI metrics
CREATE OR REPLACE FUNCTION aggregate_ai_metrics_daily(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_metrics (
    metric_date,
    scenario,
    total_calls,
    successful_calls,
    failed_calls,
    cache_hits,
    avg_confidence
  )
  SELECT 
    DATE(created_at) AS metric_date,
    scenario,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE confidence > 0) AS successful_calls,
    COUNT(*) FILTER (WHERE confidence IS NULL OR confidence = 0) AS failed_calls,
    COUNT(*) FILTER (WHERE cache_hit = TRUE) AS cache_hits,
    AVG(confidence) AS avg_confidence
  FROM ai_recommendations
  WHERE DATE(created_at) = target_date
  GROUP BY DATE(created_at), scenario
  ON CONFLICT (metric_date, scenario) DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    successful_calls = EXCLUDED.successful_calls,
    failed_calls = EXCLUDED.failed_calls,
    cache_hits = EXCLUDED.cache_hits,
    avg_confidence = EXCLUDED.avg_confidence,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_compatibility_logs IS 'Cleanup compatibility logs older than specified months (default 6)';
COMMENT ON FUNCTION aggregate_ai_metrics_daily IS 'Aggregate AI metrics for specified date (default yesterday)';

-- =====================================================
-- 13. SAMPLE DATA INITIALIZATION
-- =====================================================

-- Initialize confidence tracking for existing rules
INSERT INTO compatibility_rules_confidence (rule_name, rule_category, base_confidence, adjusted_confidence)
VALUES
  ('socket_compatibility', 'cpu_motherboard', 100, 100),
  ('power_supply_adequacy', 'power', 95, 95),
  ('thermal_capacity', 'cooling', 90, 90),
  ('ram_compatibility', 'memory', 98, 98),
  ('pcie_lane_validation', 'expansion', 92, 92),
  ('bios_support_check', 'firmware', 85, 85),
  ('bottleneck_analysis', 'performance', 75, 75),
  ('physical_clearance', 'dimensions', 95, 95)
ON CONFLICT (rule_name) DO NOTHING;

-- Initialize persona clusters with default configs
-- (User personas will be created dynamically as users interact with the system)

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all tables created
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'compatibility_logs',
    'ai_feedback',
    'ai_recommendations',
    'ai_audit_logs',
    'upgrade_paths',
    'reference_builds',
    'user_personas',
    'ai_metrics',
    'compatibility_rules_confidence',
    'ai_experiment_variants'
  )
ORDER BY table_name;

-- Verify indexes created
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'compatibility_logs',
    'ai_feedback',
    'ai_recommendations',
    'ai_audit_logs',
    'upgrade_paths',
    'reference_builds',
    'user_personas',
    'ai_metrics',
    'compatibility_rules_confidence',
    'ai_experiment_variants'
  )
ORDER BY tablename, indexname;

SELECT '✅ Enhanced AI schema migration completed successfully!' AS status;
