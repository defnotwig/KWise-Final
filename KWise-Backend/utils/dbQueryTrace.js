const TRACE_LIMIT = Math.max(100, Number.parseInt(process.env.DB_QUERY_TRACE_LIMIT || '5000', 10));

function isDbQueryTraceEnabled() {
    return process.env.DB_QUERY_TRACE === 'true';
}

function normalizeSqlLabel(text) {
    return String(text || '')
        .replaceAll(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
}

function getDbQueryTraceBuffer() {
    if (!globalThis.kwiseDbQueryTrace) {
        globalThis.kwiseDbQueryTrace = [];
    }
    return globalThis.kwiseDbQueryTrace;
}

function trimTraceBuffer(buffer) {
    while (buffer.length > TRACE_LIMIT) {
        buffer.shift();
    }
}

function recordDbQueryTrace({ text, durationMs, rowCount, error }) {
    if (!isDbQueryTraceEnabled()) {
        return;
    }

    const buffer = getDbQueryTraceBuffer();
    buffer.push({
        timestamp: new Date().toISOString(),
        label: normalizeSqlLabel(text),
        durationMs: Number(durationMs.toFixed(3)),
        rowCount: Number.isFinite(rowCount) ? rowCount : null,
        error: error ? String(error.message || error) : null
    });
    trimTraceBuffer(buffer);
}

module.exports = {
    recordDbQueryTrace,
    getDbQueryTraceBuffer,
    normalizeSqlLabel
};
