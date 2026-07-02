const redisCache = require('../config/redis');

function createHotReadCache(options = {}) {
    const ttlMs = Number.parseInt(options.ttlMs || '0', 10);
    const maxEntries = Number.parseInt(options.maxEntries || '256', 10);
    const enabled = options.enabled !== false && ttlMs > 0;
    const useRedis = options.useRedis !== false;
    const redisPrefix = options.redisPrefix || 'hot-read';
    const invalidateOnMutation = options.invalidateOnMutation !== false;
    const cache = new Map();
    const inFlight = new Map();

    const pruneIfNeeded = () => {
        while (cache.size > maxEntries) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
        }
    };

    const getRedisKey = (key) => `${redisPrefix}:${key}`;
    const redisEnabled = () => useRedis && process.env.REDIS_ENABLED === 'true';

    return async function hotReadCache(req, res, next) {
        if (!enabled) {
            return next();
        }

        if (req.method !== 'GET') {
            if (invalidateOnMutation && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                cache.clear();
                if (redisEnabled()) {
                    redisCache.delPattern(`${redisPrefix}:*`).catch(() => {});
                }
            }
            return next();
        }

        const key = req.originalUrl || req.url;
        const now = Date.now();
        const cached = cache.get(key);
        if (cached && cached.expiresAt > now) {
            res.setHeader('X-KWise-Cache', 'hit');
            res.type('application/json');
            return res.status(cached.statusCode).send(cached.payload || JSON.stringify(cached.body));
        }

        if (redisEnabled()) {
            try {
                const redisEntry = await redisCache.get(getRedisKey(key));
                if (redisEntry?.statusCode && redisEntry.body !== undefined && redisEntry.expiresAt > now) {
                    cache.set(key, {
                        statusCode: redisEntry.statusCode,
                        body: redisEntry.body,
                        payload: redisEntry.payload || JSON.stringify(redisEntry.body),
                        expiresAt: Date.now() + ttlMs
                    });
                    pruneIfNeeded();
                    res.setHeader('X-KWise-Cache', 'hit-l2');
                    res.type('application/json');
                    return res.status(redisEntry.statusCode).send(redisEntry.payload || JSON.stringify(redisEntry.body));
                }
            } catch {
                // Redis is optional; fall through to L1/database.
            }
        }

        const pending = inFlight.get(key);
        if (pending) {
            res.setHeader('X-KWise-Cache', 'coalesced');
            pending
                .then((entry) => {
                    if (!res.headersSent) {
                        res.type('application/json');
                        res.status(entry.statusCode).send(entry.payload || JSON.stringify(entry.body));
                    }
                })
                .catch(next);
            return undefined;
        }

        let resolvePending;
        let rejectPending;
        const pendingPromise = new Promise((resolve, reject) => {
            resolvePending = resolve;
            rejectPending = reject;
        });
        pendingPromise.catch(() => {});
        inFlight.set(key, pendingPromise);

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (!res.headersSent && res.statusCode >= 200 && res.statusCode < 300) {
                const payload = JSON.stringify(body);
                const entry = {
                    statusCode: res.statusCode,
                    body,
                    payload,
                    expiresAt: Date.now() + ttlMs
                };
                cache.set(key, entry);
                pruneIfNeeded();
                resolvePending(entry);
                if (redisEnabled()) {
                    redisCache
                        .set(getRedisKey(key), {
                            statusCode: entry.statusCode,
                            body: entry.body,
                            payload: entry.payload,
                            expiresAt: entry.expiresAt
                        }, Math.max(1, Math.ceil(ttlMs / 1000)))
                        .catch(() => {});
                }
                res.setHeader('X-KWise-Cache', 'miss');
            } else {
                rejectPending(new Error(`Uncacheable response status ${res.statusCode}`));
            }
            inFlight.delete(key);
            return originalJson(body);
        };

        res.on('close', () => {
            if (inFlight.get(key) === pendingPromise) {
                inFlight.delete(key);
                rejectPending(new Error('Response closed before cache entry was stored'));
            }
        });

        return next();
    };
}

module.exports = {
    createHotReadCache
};
