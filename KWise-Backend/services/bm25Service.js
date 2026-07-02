/**
 * BM25 Lexical Search Service for K-Wise RAG Pipeline
 * Implements Okapi BM25 scoring algorithm for text retrieval
 * Indexes PC parts and compatibility logs for hybrid search
 * 
 * @module BM25Service
 * @version 1.0.0
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

// BM25 hyperparameters (standard Okapi BM25 defaults)
const BM25_K1 = 1.2;   // Term frequency saturation
const BM25_B = 0.75;    // Length normalization

// Stop words (common English words to exclude from indexing)
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up', 'it',
    'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
    'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their',
    'what', 'which', 'who', 'whom', 'null', 'undefined', 'n/a', 'na', 'none'
]);

const NON_TOKEN_CHARACTERS = /[^a-z0-9\s.-]/g;
const LEADING_TOKEN_PUNCTUATION = /^[.-]+/g;
const TRAILING_TOKEN_PUNCTUATION = /[.-]+$/g;

const trimTokenPunctuation = (token) => token
    .replaceAll(LEADING_TOKEN_PUNCTUATION, '')
    .replaceAll(TRAILING_TOKEN_PUNCTUATION, '');

const normalizeJsonText = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

class BM25Service {
    constructor() {
        // Document stores keyed by collection name
        this.collections = {};
        this.initialized = false;
        this.lastIndexTime = null;
        this.indexInterval = null;
    }

    /**
     * Tokenize and normalize text
     * @param {string} text - Raw text to tokenize
     * @returns {string[]} Normalized token array
     */
    tokenize(text) {
        if (!text || typeof text !== 'string') return [];

        return text
            .toLowerCase()
            .replaceAll(NON_TOKEN_CHARACTERS, ' ')
            .split(/\s+/)
            .filter(token => token.length > 1 && !STOP_WORDS.has(token))
            .map(trimTokenPunctuation);
    }

    /**
     * Build a BM25 collection from an array of documents
     * @param {string} collectionName - Name of the collection
     * @param {Array<{id: string|number, text: string, metadata?: Object}>} documents - Documents to index
     */
    buildCollection(collectionName, documents) {
        const startTime = Date.now();
        const collection = {
            documents: new Map(),     // docId -> { tokens, length, metadata }
            df: new Map(),            // term -> document frequency count
            avgDocLength: 0,
            totalDocs: 0
        };

        let totalTokens = 0;

        for (const doc of documents) {
            const tokens = this.tokenize(doc.text);
            const termFreqs = new Map();

            // Count term frequencies within this document
            for (const token of tokens) {
                termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
            }

            // Update document frequency (count of docs containing each term)
            const uniqueTerms = new Set(tokens);
            for (const term of uniqueTerms) {
                collection.df.set(term, (collection.df.get(term) || 0) + 1);
            }

            collection.documents.set(doc.id, {
                termFreqs,
                length: tokens.length,
                metadata: doc.metadata || {}
            });

            totalTokens += tokens.length;
        }

        collection.totalDocs = collection.documents.size;
        collection.avgDocLength = collection.totalDocs > 0
            ? totalTokens / collection.totalDocs
            : 0;

        this.collections[collectionName] = collection;

        const elapsed = Date.now() - startTime;
        logger.info(`📚 BM25 index built: "${collectionName}"`, {
            documents: collection.totalDocs,
            uniqueTerms: collection.df.size,
            avgDocLength: Math.round(collection.avgDocLength),
            buildTimeMs: elapsed
        });
    }

    /**
     * Compute BM25 score for a query against a document
     * @param {string} collectionName - Collection name
     * @param {string|number} docId - Document ID
     * @param {string[]} queryTokens - Tokenized query
     * @returns {number} BM25 score
     */
    scoreBM25(collectionName, docId, queryTokens) {
        const collection = this.collections[collectionName];
        if (!collection) return 0;

        const doc = collection.documents.get(docId);
        if (!doc) return 0;

        const N = collection.totalDocs;
        const avgDL = collection.avgDocLength;
        let score = 0;

        for (const term of queryTokens) {
            const df = collection.df.get(term) || 0;
            const tf = doc.termFreqs.get(term) || 0;

            if (tf === 0 || df === 0) continue;

            // IDF component: log((N - df + 0.5) / (df + 0.5) + 1)
            const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

            // TF component with length normalization
            const tfNorm = (tf * (BM25_K1 + 1)) /
                (tf + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / avgDL)));

            score += idf * tfNorm;
        }

        return score;
    }

    /**
     * Search a collection using BM25 scoring
     * @param {string} collectionName - Collection to search
     * @param {string} query - Raw query string
     * @param {number} topK - Number of results to return
     * @returns {Array<{id: string|number, score: number, metadata: Object}>} Ranked results
     */
    search(collectionName, query, topK = 20) {
        const collection = this.collections[collectionName];
        if (!collection || collection.totalDocs === 0) {
            return [];
        }

        const queryTokens = this.tokenize(query);
        if (queryTokens.length === 0) return [];

        const results = [];

        for (const [docId] of collection.documents) {
            const score = this.scoreBM25(collectionName, docId, queryTokens);
            if (score > 0) {
                results.push({
                    id: docId,
                    score,
                    metadata: collection.documents.get(docId).metadata
                });
            }
        }

        // Sort by score descending, return top K
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }

    /**
     * Index PC parts from the database
     * @returns {Promise<number>} Number of documents indexed
     */
    async indexPcParts() {
        try {
            const result = await pool.query(`
                SELECT id, name, category, brand, description,
                       specifications::text as specs_text,
                       tier, compatible_sockets::text as sockets_text
                FROM pc_parts
                WHERE is_active = true
            `);

            const documents = result.rows.map(row => {
                // Build a rich text document from all relevant fields
                const specText = this.flattenJsonForIndex(row.specs_text);
                const socketText = this.flattenJsonForIndex(row.sockets_text);

                const text = [
                    row.name,
                    row.category,
                    row.brand,
                    row.description || '',
                    specText,
                    row.tier || '',
                    socketText
                ].join(' ');

                return {
                    id: `part_${row.id}`,
                    text,
                    metadata: {
                        type: 'pc_part',
                        partId: row.id,
                        name: row.name,
                        category: row.category,
                        brand: row.brand,
                        tier: row.tier
                    }
                };
            });

            this.buildCollection('pc_parts', documents);
            return documents.length;
        } catch (error) {
            logger.error('❌ BM25: Failed to index pc_parts', { error: error.message });
            return 0;
        }
    }

    /**
     * Index compatibility logs from the database
     * @returns {Promise<number>} Number of documents indexed
     */
    async indexCompatibilityLogs() {
        try {
            const result = await pool.query(`
                SELECT id, parts_json, rules_verdict, ai_verdict,
                       user_decision, admin_override_reason,
                       outcome_quality, outcome_notes
                FROM compatibility_logs
                WHERE outcome_quality IS NOT NULL
                  AND created_at > NOW() - INTERVAL '6 months'
                ORDER BY created_at DESC
                LIMIT 2000
            `);

            const documents = result.rows.map(row => {
                const partsText = this.flattenJsonForIndex(normalizeJsonText(row.parts_json));
                const verdictText = this.flattenJsonForIndex(normalizeJsonText(row.rules_verdict));
                let aiText = '';

                if (row.ai_verdict) {
                    aiText = this.flattenJsonForIndex(normalizeJsonText(row.ai_verdict));
                }

                const text = [
                    partsText,
                    verdictText,
                    aiText,
                    row.admin_override_reason || '',
                    row.outcome_notes || '',
                    row.outcome_quality || '',
                    row.user_decision || ''
                ].join(' ');

                return {
                    id: `log_${row.id}`,
                    text,
                    metadata: {
                        type: 'compatibility_log',
                        logId: row.id,
                        outcome: row.outcome_quality,
                        userDecision: row.user_decision,
                        adminOverride: row.admin_override_reason
                    }
                };
            });

            this.buildCollection('compatibility_logs', documents);
            return documents.length;
        } catch (error) {
            logger.error('❌ BM25: Failed to index compatibility_logs', { error: error.message });
            return 0;
        }
    }

    /**
     * Flatten JSON string into indexable text
     * Extracts all string values from nested JSON
     * @param {string} jsonStr - JSON string to flatten
     * @returns {string} Flattened text
     */
    flattenJsonForIndex(jsonStr) {
        if (!jsonStr) return '';
        try {
            const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
            const values = [];
            this._extractStrings(obj, values);
            return values.join(' ');
        } catch {
            return typeof jsonStr === 'string' ? jsonStr : '';
        }
    }

    /**
     * Recursively extract string values from an object
     * @param {*} obj - Object to traverse
     * @param {string[]} acc - Accumulator for extracted strings
     */
    _extractStrings(obj, acc) {
        if (typeof obj === 'string') {
            acc.push(obj);
        } else if (Array.isArray(obj)) {
            for (const item of obj) {
                this._extractStrings(item, acc);
            }
        } else if (obj && typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
                // Include key names for specs (e.g., "socket", "wattage", "cores")
                if (typeof key === 'string' && key.length > 2) {
                    acc.push(key);
                }
                this._extractStrings(obj[key], acc);
            }
        } else if (typeof obj === 'number') {
            acc.push(String(obj));
        }
    }

    /**
     * Initialize all indexes from database
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;

        logger.info('📚 BM25 Service: Initializing indexes...');
        const startTime = Date.now();

        const [partsCount, logsCount] = await Promise.all([
            this.indexPcParts(),
            this.indexCompatibilityLogs()
        ]);

        this.initialized = true;
        this.lastIndexTime = Date.now();

        logger.info('✅ BM25 Service: Indexes ready', {
            pcParts: partsCount,
            compatibilityLogs: logsCount,
            totalBuildTimeMs: Date.now() - startTime
        });

        // Schedule periodic re-indexing every 30 minutes
        if (!this.indexInterval) {
            this.indexInterval = setInterval(() => {
                this.reindex().catch(err =>
                    logger.error('❌ BM25 reindex failed', { error: err.message })
                );
            }, 30 * 60 * 1000);

            // Allow process to exit cleanly
            if (this.indexInterval.unref) {
                this.indexInterval.unref();
            }
        }
    }

    /**
     * Re-index all collections
     * @returns {Promise<void>}
     */
    async reindex() {
        logger.info('🔄 BM25 Service: Re-indexing...');
        await Promise.all([
            this.indexPcParts(),
            this.indexCompatibilityLogs()
        ]);
        this.lastIndexTime = Date.now();
        logger.info('✅ BM25 Service: Re-index complete');
    }

    /**
     * Get index statistics
     * @returns {Object} Statistics for all collections
     */
    getStats() {
        const stats = {};
        for (const [name, collection] of Object.entries(this.collections)) {
            stats[name] = {
                totalDocs: collection.totalDocs,
                uniqueTerms: collection.df.size,
                avgDocLength: Math.round(collection.avgDocLength)
            };
        }
        return {
            initialized: this.initialized,
            lastIndexTime: this.lastIndexTime,
            collections: stats
        };
    }

    /**
     * Destroy the service and clear intervals
     */
    destroy() {
        if (this.indexInterval) {
            clearInterval(this.indexInterval);
            this.indexInterval = null;
        }
        this.collections = {};
        this.initialized = false;
    }
}

// Singleton
const bm25Service = new BM25Service();
module.exports = bm25Service;
