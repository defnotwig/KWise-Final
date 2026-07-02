/**
 * Hybrid RAG Pipeline with Reciprocal Rank Fusion (RRF)
 * Combines vector embeddings (semantic) + BM25 (lexical) search
 * Uses RRF to fuse ranked lists into a single relevance-ordered result set
 * 
 * RRF_score(d) = Σ (1 / (k + rank_i(d)))   where k = 60 (constant)
 * 
 * Architecture:
 *   Query → [VectorRetriever, BM25Retriever] → RRF Fusion → Context Builder → LLM
 * 
 * @module RAGPipeline
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const bm25Service = require('./bm25Service');
const embeddingService = require('./embeddingService');
const aiCircuitBreaker = require('./aiCircuitBreaker');
const intelligentCache = require('./intelligentCache');
const ollamaService = require('../ai/services/ollamaService');
const pool = require('../config/db');

// RRF constant (standard default from the original paper)
const RRF_K = 60;

// Maximum tokens for context window (conservative for DeepSeek R1:1.5b)
const MAX_CONTEXT_TOKENS = 2000;

class RAGPipeline {
    initialized = false;
    productEmbeddings = new Map(); // Pre-computed: partId -> { embedding, metadata }
    stats = {
        totalQueries: 0,
        vectorHits: 0,
        bm25Hits: 0,
        fusedResults: 0,
        cacheHits: 0,
        errors: 0,
        avgLatencyMs: 0,
        latencies: []
    };

    /**
     * Initialize the pipeline (indexes, embeddings, connections)
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;

        logger.info('🔗 RAG Pipeline: Initializing...');
        const startTime = Date.now();

        try {
            // Initialize BM25 indexes
            await bm25Service.initialize();

            // Pre-compute product embeddings (background, non-blocking)
            this._precomputeProductEmbeddings().catch(err =>
                logger.warn('⚠️ RAG: Product embedding pre-computation failed (non-critical)', { error: err.message })
            );

            this.initialized = true;
            logger.info('✅ RAG Pipeline: Ready', {
                initTimeMs: Date.now() - startTime,
                bm25Stats: bm25Service.getStats()
            });
        } catch (error) {
            logger.error('❌ RAG Pipeline: Initialization failed', { error: error.message });
            this.initialized = true; // BM25 can still work
        }
    }

    /**
     * Pre-compute embeddings for all active products (rate-limited)
     * Runs in background to avoid blocking initialization
     */
    async _precomputeProductEmbeddings() {
        try {
            const result = await pool.query(`
                SELECT id, name, category, brand, description, tier
                FROM pc_parts WHERE is_active = true
            `);

            let computed = 0;
            let failed = 0;

            for (const row of result.rows) {
                const text = [row.name, row.category, row.brand, row.description || '', row.tier || ''].join(' ');
                const embedding = await embeddingService.generateTextEmbedding(text);

                if (embedding) {
                    this.productEmbeddings.set(row.id, {
                        embedding,
                        metadata: {
                            type: 'pc_part',
                            partId: row.id,
                            name: row.name,
                            category: row.category,
                            brand: row.brand,
                            tier: row.tier
                        }
                    });
                    computed++;
                } else {
                    failed++;
                    // If too many failures, stop early (Ollama likely down)
                    if (failed > 5) {
                        logger.warn('⚠️ RAG: Too many embedding failures, stopping pre-computation');
                        break;
                    }
                }
            }

            logger.info('✅ RAG: Product embeddings pre-computed', {
                total: result.rows.length,
                computed,
                failed,
                cached: this.productEmbeddings.size
            });
        } catch (error) {
            logger.error('❌ RAG: Pre-compute embeddings failed', { error: error.message });
        }
    }

    // =====================================================================
    //  RETRIEVAL METHODS
    // =====================================================================

    /**
     * Vector retrieval using embedding similarity
     * @param {string} query - Natural language query
     * @param {string} collection - Target collection ('pc_parts' | 'builds')
     * @param {number} topK - Number of results
     * @returns {Promise<Array<{id: string, score: number, metadata: Object}>>}
     */
    async vectorRetrieve(query, collection = 'pc_parts', topK = 20) {
        try {
            // Generate query embedding (single Ollama call)
            const queryEmbedding = await embeddingService.generateTextEmbedding(query);
            if (!queryEmbedding) {
                logger.warn('⚠️ RAG: Vector retrieval skipped — no embedding generated');
                return [];
            }

            if (collection === 'pc_parts') {
                return this._vectorSearchPcParts(queryEmbedding, topK);
            } else if (collection === 'builds') {
                return await this._vectorSearchBuilds(queryEmbedding, topK);
            }

            return [];
        } catch (error) {
            logger.error('❌ RAG: Vector retrieval failed', { error: error.message, collection });
            return [];
        }
    }

    /**
     * Vector search over pc_parts using pre-computed embeddings
     * Only ONE Ollama call needed (for the query), all products are pre-cached
     */
    _vectorSearchPcParts(queryEmbedding, topK) {
        if (this.productEmbeddings.size === 0) {
            logger.warn('⚠️ RAG: No pre-computed product embeddings available');
            return [];
        }

        const results = [];
        for (const [partId, entry] of this.productEmbeddings) {
            const similarity = embeddingService.cosineSimilarity(queryEmbedding, entry.embedding);
            if (similarity > 0.3) {
                results.push({
                    id: `part_${partId}`,
                    score: similarity,
                    metadata: entry.metadata
                });
            }
        }

        const sortedResults = results.toSorted((left, right) => right.score - left.score);
        return sortedResults.slice(0, topK);
    }

    /**
     * Vector search over historical builds
     */
    async _vectorSearchBuilds(queryEmbedding, topK) {
        try {
            const historicalBuilds = await embeddingService.getHistoricalBuilds();
            if (!historicalBuilds || historicalBuilds.length === 0) return [];

            const scored = await Promise.all(
                historicalBuilds.map(async (build) => {
                    const buildEmbedding = await embeddingService.generateBuildEmbedding(build);
                    if (!buildEmbedding) return null;

                    const similarity = embeddingService.cosineSimilarity(queryEmbedding, buildEmbedding);
                    return {
                        id: `build_${build.id || Math.random().toString(36).slice(2)}`,
                        score: similarity,
                        metadata: {
                            type: 'compatibility_log',
                            outcome: build.outcome,
                            userAccepted: build.userAccepted,
                            adminOverride: build.adminOverride,
                            adminReason: build.adminReason,
                            build
                        }
                    };
                })
            );

            return scored
                .filter(s => s !== null && s.score > 0.3)
                .toSorted((left, right) => right.score - left.score)
                .slice(0, topK);
        } catch (error) {
            logger.error('❌ RAG: Vector builds search failed', { error: error.message });
            return [];
        }
    }

    /**
     * BM25 lexical retrieval
     * @param {string} query - Raw query
     * @param {string} collection - BM25 collection name
     * @param {number} topK - Number of results
     * @returns {Array<{id: string, score: number, metadata: Object}>}
     */
    bm25Retrieve(query, collection = 'pc_parts', topK = 20) {
        try {
            if (!bm25Service.initialized) {
                logger.warn('⚠️ RAG: BM25 not initialized yet');
                return [];
            }
            return bm25Service.search(collection, query, topK);
        } catch (error) {
            logger.error('❌ RAG: BM25 retrieval failed', { error: error.message, collection });
            return [];
        }
    }

    // =====================================================================
    //  RRF FUSION
    // =====================================================================

    /**
     * Reciprocal Rank Fusion: merge multiple ranked lists into one
     * RRF_score(d) = Σ (1 / (k + rank_i(d)))
     * 
     * @param {Array<Array<{id: string, score: number, metadata: Object}>>} rankedLists
     * @param {number} k - RRF constant (default 60)
     * @returns {Array<{id: string, rrfScore: number, metadata: Object, sources: string[]}>}
     */
    fuseRRF(rankedLists, k = RRF_K) {
        const fusedScores = new Map(); // id -> { rrfScore, metadata, sources }

        for (let listIdx = 0; listIdx < rankedLists.length; listIdx++) {
            const rankedList = rankedLists[listIdx];
            const sourceName = listIdx === 0 ? 'vector' : 'bm25';

            for (let rank = 0; rank < rankedList.length; rank++) {
                const doc = rankedList[rank];
                const rrfContribution = 1 / (k + rank + 1); // rank is 0-indexed, so +1

                if (fusedScores.has(doc.id)) {
                    const existing = fusedScores.get(doc.id);
                    existing.rrfScore += rrfContribution;
                    existing.sources.push(sourceName);
                } else {
                    fusedScores.set(doc.id, {
                        id: doc.id,
                        rrfScore: rrfContribution,
                        metadata: doc.metadata,
                        sources: [sourceName]
                    });
                }
            }
        }

        // Sort by fused RRF score descending
        return Array.from(fusedScores.values())
            .toSorted((left, right) => right.rrfScore - left.rrfScore);
    }

    // =====================================================================
    //  CONTEXT WINDOW BUILDER
    // =====================================================================

    /**
     * Build a context window from fused retrieval results
     * Formats retrieved documents into a structured context for the LLM prompt
     * 
     * @param {Array} fusedResults - RRF-fused results
     * @param {number} maxResults - Maximum documents to include in context
     * @returns {string} Formatted context string
     */
    buildContextWindow(fusedResults, maxResults = 10) {
        if (!Array.isArray(fusedResults) || fusedResults.length === 0) {
            return '';
        }

        const topResults = fusedResults.slice(0, maxResults);
        const sections = [];

        this._appendProductContext(sections, topResults.filter(result => result.metadata?.type === 'pc_part'));
        this._appendHistoryContext(sections, topResults.filter(result => result.metadata?.type === 'compatibility_log'));

        return sections.join('\n');
    }

    _appendProductContext(sections, pcParts) {
        if (pcParts.length === 0) {
            return;
        }

        sections.push('<retrieved_products>');
        for (const part of pcParts) {
            const metadata = part.metadata;
            const specString = this._formatPartSpecs(metadata.specifications);
            sections.push(
                `- ${metadata.name} [${metadata.category}] ${metadata.brand} | ₱${metadata.price} | Tier: ${metadata.tier} | Stock: ${metadata.stock}` +
                (specString ? ` | Specs: ${specString}` : '') +
                ` (relevance: ${part.rrfScore.toFixed(4)}, sources: ${part.sources.join('+')})`
            );
        }
        sections.push('</retrieved_products>');
    }

    _appendHistoryContext(sections, logs) {
        if (logs.length === 0) {
            return;
        }

        sections.push('<retrieved_compatibility_history>');
        for (const log of logs) {
            const metadata = log.metadata;
            const buildSummary = metadata.build
                ? embeddingService.summarizeBuild(metadata.build)
                : 'Unknown build';
            sections.push(
                `- ${buildSummary} | Outcome: ${metadata.outcome || 'unknown'}` +
                ` | User: ${metadata.userAccepted ? 'accepted' : 'rejected'}` +
                (metadata.adminReason ? ` | Admin: ${metadata.adminReason}` : '') +
                ` (relevance: ${log.rrfScore.toFixed(4)}, sources: ${log.sources.join('+')})`
            );
        }
        sections.push('</retrieved_compatibility_history>');
    }

    _formatPartSpecs(specifications) {
        if (!specifications) {
            return '';
        }

        return Object.entries(specifications)
            .slice(0, 8)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }

    // =====================================================================
    //  MAIN QUERY METHODS
    // =====================================================================

    /**
     * Execute a full hybrid RAG query
     * Query → [Vector, BM25] → RRF → Context → LLM → Response
     * 
     * @param {string} query - Natural language query
     * @param {Object} options - Query options
     * @param {string} options.collection - Target collection ('pc_parts' | 'builds' | 'all')
     * @param {number} options.topK - Number of retrieval results per retriever
     * @param {number} options.maxContext - Max documents in context window
     * @param {string} options.systemPrompt - Override system prompt
     * @param {boolean} options.returnContext - If true, return context without LLM call
     * @returns {Promise<Object>} RAG response with context and generation
     */
    async query(query, options = {}) {
        const startTime = Date.now();
        this.stats.totalQueries++;

        const {
            collection = 'pc_parts',
            topK = 20,
            maxContext = 10,
            systemPrompt = null,
            returnContext = false
        } = options;

        try {
            // Ensure initialized
            if (!this.initialized) {
                await this.initialize();
            }

            // Check cache
            const cacheKey = `rag:${collection}:${query.substring(0, 100)}`;
            const cached = await new Promise((resolve, reject) => {
                Promise.resolve(intelligentCache.get(cacheKey, 'rag'))
                    .then(resolve)
                    .catch(reject);
            });
            if (cached) {
                this.stats.cacheHits++;
                return { ...cached, source: 'cache', cached: true, latencyMs: Date.now() - startTime };
            }

            // --- PARALLEL RETRIEVAL ---
            const collections = collection === 'all'
                ? ['pc_parts', 'compatibility_logs']
                : [collection === 'builds' ? 'compatibility_logs' : collection];

            const allVectorResults = [];
            const allBm25Results = [];

            // Run vector + BM25 in parallel for each target collection
            await Promise.all(collections.map(async (col) => {
                const [vectorResults, bm25Results] = await Promise.all([
                    this.vectorRetrieve(query, col === 'compatibility_logs' ? 'builds' : 'pc_parts', topK),
                    Promise.resolve(this.bm25Retrieve(query, col, topK))
                ]);

                allVectorResults.push(...vectorResults);
                allBm25Results.push(...bm25Results);

                if (vectorResults.length > 0) this.stats.vectorHits++;
                if (bm25Results.length > 0) this.stats.bm25Hits++;
            }));

            // --- RRF FUSION ---
            const fusedResults = this.fuseRRF([allVectorResults, allBm25Results]);
            this.stats.fusedResults += fusedResults.length;

            // --- BUILD CONTEXT ---
            const contextWindow = this.buildContextWindow(fusedResults, maxContext);

            if (returnContext) {
                return {
                    success: true,
                    context: contextWindow,
                    fusedResults,
                    retrievalStats: {
                        vectorCount: allVectorResults.length,
                        bm25Count: allBm25Results.length,
                        fusedCount: fusedResults.length
                    },
                    latencyMs: Date.now() - startTime
                };
            }

            // --- LLM GENERATION ---
            const response = await this._generateWithContext(query, contextWindow, systemPrompt);

            const latency = Date.now() - startTime;
            this._recordLatency(latency);

            const result = {
                success: true,
                answer: response,
                context: contextWindow,
                retrievalStats: {
                    vectorCount: allVectorResults.length,
                    bm25Count: allBm25Results.length,
                    fusedCount: fusedResults.length,
                    topDocSources: fusedResults.slice(0, 5).map(r => ({
                        id: r.id,
                        sources: r.sources,
                        score: r.rrfScore.toFixed(4)
                    }))
                },
                source: 'rag',
                latencyMs: latency
            };

            // Cache successful result
            intelligentCache.set(cacheKey, result, 'rag', 80);

            return result;

        } catch (error) {
            this.stats.errors++;
            logger.error('❌ RAG Pipeline: Query failed', { error: error.message, query: query.substring(0, 100) });

            return {
                success: false,
                answer: null,
                error: error.message,
                source: 'error',
                latencyMs: Date.now() - startTime
            };
        }
    }

    /**
     * Retrieve context for compatibility analysis (no LLM call)
     * Used by enhancedAIService to augment its own prompts
     * 
     * @param {Object} parts - Build parts
     * @param {Object} userContext - User context
     * @returns {Promise<{context: string, stats: Object}>}
     */
    async retrieveCompatibilityContext(parts, userContext = {}) {
        const startTime = Date.now();

        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Build a descriptive query from the parts
            const queryParts = [];
            for (const [key, value] of Object.entries(parts)) {
                if (value?.name) {
                    queryParts.push(`${key}: ${value.name}`);
                }
            }
            const query = queryParts.join(', ') +
                (userContext.primary_use ? ` for ${userContext.primary_use}` : '') +
                (userContext.budget?.max ? ` budget ${userContext.budget.max}` : '');

            // Parallel retrieval from both collections
            const [vectorParts, bm25Parts, vectorBuilds, bm25Builds] = await Promise.all([
                this.vectorRetrieve(query, 'pc_parts', 10),
                Promise.resolve(this.bm25Retrieve(query, 'pc_parts', 10)),
                this.vectorRetrieve(query, 'builds', 10),
                Promise.resolve(this.bm25Retrieve(query, 'compatibility_logs', 10))
            ]);

            // Fuse each pair with RRF
            const fusedParts = this.fuseRRF([vectorParts, bm25Parts]);
            const fusedBuilds = this.fuseRRF([vectorBuilds, bm25Builds]);

            // Combine (parts first, then historical builds)
            const combined = [...fusedParts.slice(0, 5), ...fusedBuilds.slice(0, 5)];
            const contextWindow = this.buildContextWindow(combined, 10);

            return {
                context: contextWindow,
                stats: {
                    vectorParts: vectorParts.length,
                    bm25Parts: bm25Parts.length,
                    vectorBuilds: vectorBuilds.length,
                    bm25Builds: bm25Builds.length,
                    fusedTotal: combined.length,
                    latencyMs: Date.now() - startTime
                }
            };
        } catch (error) {
            logger.error('❌ RAG: Compatibility context retrieval failed', { error: error.message });
            return { context: '', stats: { error: error.message } };
        }
    }

    /**
     * Product search using hybrid RAG
     * Returns ranked products with optional AI summary
     * 
     * @param {string} query - Natural language product query
     * @param {Object} filters - Optional filters (category, budget, tier)
     * @param {boolean} withAISummary - Whether to generate AI summary
     * @returns {Promise<Object>} Search results
     */
    async productSearch(query, filters = {}, withAISummary = false) {
        const startTime = Date.now();

        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Retrieval
            const [vectorResults, bm25Results] = await Promise.all([
                this.vectorRetrieve(query, 'pc_parts', 30),
                Promise.resolve(this.bm25Retrieve(query, 'pc_parts', 30))
            ]);

            // RRF Fusion
            let fusedResults = this.fuseRRF([vectorResults, bm25Results]);

            // Apply post-fusion filters
            if (filters.category) {
                fusedResults = fusedResults.filter(r =>
                    r.metadata?.category?.toLowerCase() === filters.category.toLowerCase()
                );
            }
            if (filters.maxPrice) {
                fusedResults = fusedResults.filter(r =>
                    r.metadata?.price <= filters.maxPrice
                );
            }
            if (filters.minPrice) {
                fusedResults = fusedResults.filter(r =>
                    r.metadata?.price >= filters.minPrice
                );
            }
            if (filters.tier) {
                fusedResults = fusedResults.filter(r =>
                    r.metadata?.tier?.toLowerCase() === filters.tier.toLowerCase()
                );
            }

            // Optional AI summary
            let aiSummary = null;
            if (withAISummary && fusedResults.length > 0) {
                const contextWindow = this.buildContextWindow(fusedResults.slice(0, 8), 8);
                aiSummary = await this._generateWithContext(
                    `Summarize the best product options for: "${query}"`,
                    contextWindow,
                    'You are a PC hardware expert. Provide a concise recommendation summary based on the retrieved products. Be specific about which products suit the query best and why.'
                );
            }

            return {
                success: true,
                query,
                products: fusedResults.map(r => ({
                    ...r.metadata,
                    relevanceScore: r.rrfScore,
                    sources: r.sources
                })),
                totalResults: fusedResults.length,
                aiSummary,
                retrievalStats: {
                    vectorCount: vectorResults.length,
                    bm25Count: bm25Results.length,
                    fusedCount: fusedResults.length
                },
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            logger.error('❌ RAG: Product search failed', { error: error.message });
            return {
                success: false,
                query,
                products: [],
                error: error.message,
                latencyMs: Date.now() - startTime
            };
        }
    }

    // =====================================================================
    //  LLM GENERATION WITH CONTEXT
    // =====================================================================

    /**
     * Generate LLM response with RAG context
     * @param {string} query - User query
     * @param {string} context - Retrieved context window
     * @param {string} systemPrompt - System prompt override
     * @returns {Promise<string>} Generated response
     */
    async _generateWithContext(query, context, systemPrompt = null) {
        const system = systemPrompt ||
            'You are K-Wise AI, an expert PC hardware assistant. ' +
            'Answer the user\'s question using ONLY the retrieved context below. ' +
            'If the context does not contain enough information, say so honestly. ' +
            'Be specific, cite product names and specs when available.';

        const prompt = context
            ? `${context}\n\n<user_query>${query}</user_query>\n\nAnswer based on the retrieved context above.`
            : query;

        const result = await aiCircuitBreaker.call(
            async () => {
                return await ollamaService.generateResponse(
                    prompt,
                    system,
                    { max_tokens: 1500, temperature: 0.2 }
                );
            },
            'I could not generate a response at this time. Please try again.',
            { scenario: 'rag_generation' }
        );

        if (result.success) {
            return result.data?.response || result.data || '';
        }
        return result.data || 'AI generation unavailable — please try again later.';
    }

    // =====================================================================
    //  STATS & UTILITIES
    // =====================================================================

    _recordLatency(latency) {
        this.stats.latencies.push(latency);
        // Keep last 100 latencies
        if (this.stats.latencies.length > 100) {
            this.stats.latencies.shift();
        }
        this.stats.avgLatencyMs = Math.round(
            this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length
        );
    }

    /**
     * Get pipeline statistics
     */
    getStats() {
        return {
            ...this.stats,
            bm25Stats: bm25Service.getStats(),
            initialized: this.initialized
        };
    }

    /**
     * Force re-index of BM25 collections
     */
    async reindex() {
        await bm25Service.reindex();
        logger.info('✅ RAG Pipeline: BM25 re-indexed');
    }

    /**
     * Destroy the pipeline
     */
    destroy() {
        bm25Service.destroy();
        this.initialized = false;
    }
}

// Singleton
const ragPipeline = new RAGPipeline();
module.exports = ragPipeline;
