/**
 * AI Configuration - OPTIMIZED FOR PERFORMANCE
 * Emergency fixes applied: 2025-11-03T08:01:10.941Z
 */

module.exports = {
  service: {
    enabled: true,
    debugMode: false,
    healthCheckInterval: 60000  // 1 minute
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.AI_MODEL || 'deepseek-r1:1.5b',  // Use 1.5b due to VRAM constraints (7b out of memory)
    timeout: 60000,  // ✅ FIX: Increased to 60s for complex compatibility analysis
    maxRetries: 3,  // PHASE 2 ERROR FIX #2: Increased from 2 to 3 for better resilience with hot picks
    retryDelay: 1000,  // PHASE 2 ERROR FIX #2: Increased from 500ms to 1000ms to give Ollama more recovery time
    
    // VRAM FIX: Use 1.5b model (7b model caused CUDA out of memory error)
    models: {
      primary: 'deepseek-r1:1.5b',  // VRAM-friendly: Works with limited GPU memory
      fallback: 'deepseek-r1:1.5b', // Same model for consistency
      embedding: 'nomic-embed-text'
    },
    
    // OPTIMIZED: Shorter responses
    generation: {
      temperature: 0.3,        // More deterministic
      maxTokens: 250,          // Reduced from 500
      numPredict: 250,         // Shorter outputs
      timeout: 60000,          // ✅ FIX: Increased to 60s for complex compatibility analysis
      stopSequences: ['\n\n\n', 'END_ANALYSIS']
    },
    
    // OPTIMIZED: Aggressive retries
    retry: {
      maxAttempts: 2,          // Reduced from 3
      delayMs: 500,            // Faster retry
      backoff: 1.5
    }
  },

  cache: {
    enabled: true,             // Enable caching
    maxSize: 500,              // Max entries in LRU cache
    ttl: 10 * 60,              // 10 minutes (in seconds for ollama)
    
    // For intelligentCache 3-tier system
    tiers: {
      hot: 10 * 60 * 1000,     // 10 minutes
      warm: 60 * 60 * 1000,    // 1 hour
      cold: 4 * 60 * 60 * 1000 // 4 hours
    },
    
    limits: {
      hot: 200,                // PHASE 3: Increased from 100 (more hot cache hits)
      warm: 1000,
      cold: 2000
    },
    
    // PHASE 3: Lower confidence threshold for caching
    confidenceThreshold: 70,   // Cache results with confidence >= 70% (was 80%)
    
    
    // Database persistence
    persistence: {
      enabled: true,
      tableName: 'ai_cache',
      syncInterval: 60000
    }
  },

  circuitBreaker: {
    failureThreshold: 5,       // ROOT CAUSE FIX #2: Increased from 3 to 5 (less sensitive to cold starts)
    successThreshold: 2,       // Keep: recover quickly after success
    timeout: 60000,            // ✅ FIX: Increased to 60s for complex requests
    slowCallThreshold: 15000,  // PHASE 3: 15s threshold (model needs 7-8s + overhead)
    halfOpenMaxCalls: 3        // PHASE 3: Allow more test calls in HALF_OPEN state
  },

  promptOptimization: {
    // ENABLED: Shorter prompts
    maxPromptLength: 3000,     // Enforce 3K limit (was ~6K)
    includeExamples: true,
    verbosity: 'concise',      // 'verbose', 'normal', 'concise'
    stripWhitespace: true
  },

  features: {
    // ENABLED: All optimizations
    intelligentCaching: true,
    precomputation: true,
    batchProcessing: false,    // Not implemented yet
    embeddings: true,
    experiments: false         // Disable A/B testing for now
  },

  performance: {
    // Target metrics
    targetLatencyMs: 5000,
    acceptableLatencyMs: 8000,
    maxLatencyMs: 60000,  // ✅ FIX: Increased to 60s to match timeout
    
    // Monitoring
    logSlowCalls: true,
    slowCallThreshold: 15000,  // ROOT CAUSE FIX #3: Increased from 8s to 15s (model takes 7-8s, log if >15s)
    alertOnConsecutiveFailures: 3
  }
};
