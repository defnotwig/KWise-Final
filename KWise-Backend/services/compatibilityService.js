const crypto = require('node:crypto');
const db = require('../config/db');
const logger = require('../utils/logger');
const { deterministicCompatibilityService } = require('./deterministicCompatibilityService');

class CompatibilityService {
    constructor() {
        this.source = 'deterministic';
        this.model = null;
        this.isAvailable = true;
        this.loggingEnabled = true;
        this.initialized = false;
    }

    async initialize() {
        await deterministicCompatibilityService.initialize();
        this.initialized = true;
    }

    async checkAvailability() {
        this.isAvailable = true;
        return true;
    }

    generateBuildHash(parts) {
        try {
            const stableParts = JSON.stringify(parts, Object.keys(parts || {}).sort());
            return crypto.createHash('md5').update(stableParts).digest('hex');
        } catch (error) {
            logger.warn('[Compatibility] Failed to generate build hash:', error.message);
            return crypto.createHash('md5').update(String(Date.now())).digest('hex');
        }
    }

    async logCompatibilityCheck(logData) {
        if (!this.loggingEnabled) return;

        try {
            const buildHash = logData.build_hash || this.generateBuildHash(logData.parts_json || {});
            const deterministicVerdict = {
                source: 'deterministic',
                latencyMs: logData.latencyMs ?? logData.latency_ms ?? null,
                ...(logData.rules_verdict || {})
            };
            await db.query(`
                INSERT INTO compatibility_logs (
                    build_hash, parts_json, rules_verdict, ai_verdict,
                    user_context, session_id, user_decision, outcome_quality,
                    created_at
                ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8, NOW())
            `, [
                buildHash,
                JSON.stringify(logData.parts_json || {}),
                JSON.stringify(deterministicVerdict),
                null,
                JSON.stringify(logData.user_context || {}),
                logData.session_id || 'offline-kiosk',
                logData.user_decision || 'pending',
                logData.outcome_quality || 'unknown'
            ]);
        } catch (error) {
            logger.debug('[Compatibility] Deterministic log write skipped:', error.message);
        }
    }

    async analyzeCompatibility(currentProduct, candidateProducts = [], options = {}) {
        if (!candidateProducts || candidateProducts.length === 0) {
            return [];
        }

        return deterministicCompatibilityService.rankCandidates(
            currentProduct,
            candidateProducts,
            options
        ).filter((product) => product.compatible !== false && product.compatibility_score > 0);
    }

    async analyzeBatch(contextParts = [], candidateProducts = [], options = {}) {
        if (!candidateProducts || candidateProducts.length === 0) {
            return [];
        }

        return deterministicCompatibilityService.analyzeBatch(
            contextParts,
            candidateProducts,
            options
        );
    }

    async analyzeFullBuild(components = {}) {
        return deterministicCompatibilityService.analyzeBuild(components);
    }

    async runDeterministicRules(currentProduct, candidateProducts = []) {
        const results = {};
        for (const candidate of candidateProducts) {
            const result = deterministicCompatibilityService.analyzePair(currentProduct, candidate);
            results[candidate.id || candidate.name] = {
                compatible: result.compatible,
                score: result.score,
                verdict: result.verdict,
                issues: result.problems,
                warnings: result.warnings,
                manualChecks: result.manualChecks,
                rulesApplied: result.rulesApplied,
                source: 'deterministic'
            };
        }
        return results;
    }

    async mapDeterministicToProducts(products = [], deterministicResults = {}) {
        return products.map((product) => {
            const result = deterministicResults[product.id || product.name] || {};
            return {
                ...product,
                compatible: result.compatible !== false,
                source: 'deterministic',
                compatibility_score: result.score ?? (result.compatible === false ? 0 : 80),
                compatibility_status: result.compatible === false ? 'incompatible' : (result.verdict || 'manual_check'),
                compatibility_reason: result.issues?.[0]?.message ||
                    result.warnings?.[0]?.message ||
                    result.manualChecks?.[0]?.message ||
                    'Deterministic compatibility check completed.',
                deterministic_issues: result.issues || [],
                warnings: result.warnings || [],
                manualChecks: result.manualChecks || [],
                rulesApplied: result.rulesApplied || []
            };
        });
    }

    getFallbackCompatibility(currentProduct, candidateProducts = []) {
        return deterministicCompatibilityService.rankCandidates(currentProduct, candidateProducts);
    }

    getStatus() {
        return {
            ...deterministicCompatibilityService.getStatus(),
            service: 'compatibilityService',
            source: 'deterministic',
            aiEnabled: false,
            model: null,
            ollama: 'disabled',
            mlEnabled: false
        };
    }

    createCompatibilityPrompt() {
        return 'AI compatibility prompts are disabled in offline deterministic kiosk mode.';
    }
}

const compatibilityService = new CompatibilityService();

module.exports = {
    CompatibilityService,
    compatibilityService
};
