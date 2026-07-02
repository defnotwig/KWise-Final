const crypto = require('node:crypto');

const TRACE_LIMIT = Math.max(100, Number.parseInt(process.env.LATENCY_TRACE_LIMIT || '5000', 10));

function isLatencyTraceEnabled() {
    return process.env.LATENCY_TRACE === 'true';
}

function getLatencyTraceBuffer() {
    if (!globalThis.kwiseLatencyTrace) {
        globalThis.kwiseLatencyTrace = [];
    }
    return globalThis.kwiseLatencyTrace;
}

function trimTraceBuffer(buffer) {
    while (buffer.length > TRACE_LIMIT) {
        buffer.shift();
    }
}

function getRequestPath(req) {
    return req.originalUrl
        ? req.originalUrl.split('?')[0]
        : req.path || req.url || 'unknown';
}

function installLatencyTrace(app, logger = console) {
    if (!isLatencyTraceEnabled()) {
        return false;
    }

    app.use((req, res, next) => {
        const startedAt = process.hrtime.bigint();
        const requestId = req.headers['x-request-id'] || crypto.randomUUID();
        req.kwiseRequestId = requestId;
        res.setHeader('X-KWise-Request-Id', requestId);

        const originalWriteHead = res.writeHead;
        res.writeHead = function writeHeadWithServerTiming(...args) {
            if (!res.headersSent) {
                const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
                res.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(3)}`);
            }
            return originalWriteHead.apply(this, args);
        };

        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
            const entry = {
                timestamp: new Date().toISOString(),
                requestId,
                method: req.method,
                path: getRequestPath(req),
                statusCode: res.statusCode,
                durationMs: Number(durationMs.toFixed(3)),
                userAgent: req.headers['user-agent'] || null
            };

            const buffer = getLatencyTraceBuffer();
            buffer.push(entry);
            trimTraceBuffer(buffer);

            if (process.env.LATENCY_TRACE_LOG === 'true') {
                logger.info('[LatencyTrace]', entry);
            }
        });

        next();
    });

    logger.info('Latency trace enabled for this process');
    return true;
}

module.exports = {
    installLatencyTrace,
    getLatencyTraceBuffer
};
