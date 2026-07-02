const DEFAULT_TTL_MS = 15000;
const DEFAULT_MAX_ENTRIES = 200;

const now = () => Date.now();

const stableStringify = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value !== 'object') {
        return String(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }

    return `{${Object.keys(value).sort().map((key) => `${key}:${stableStringify(value[key])}`).join(',')}}`;
};

const appendParams = (url, params = {}) => {
    Object.keys(params || {}).sort().forEach((key) => {
        const value = params[key];
        if (value === undefined || value === null) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((entry) => url.searchParams.append(key, entry));
            return;
        }

        url.searchParams.set(key, value);
    });
};

const buildCacheKey = (config) => {
    const url = new URL(config.url || '', config.baseURL || globalThis.location?.origin || 'http://localhost');
    appendParams(url, config.params);

    const entries = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => (
        `${leftKey}=${leftValue}`.localeCompare(`${rightKey}=${rightValue}`)
    ));
    url.search = '';
    entries.forEach(([key, value]) => url.searchParams.append(key, value));

    return [
        String(config.method || 'get').toUpperCase(),
        url.origin,
        url.pathname,
        url.search,
        stableStringify(config.data),
        config.withCredentials ? 'credentials' : 'anonymous'
    ].join('|');
};

const cloneResponse = (response, config, headers = {}) => ({
    ...response,
    config,
    headers: {
        ...(response.headers || {}),
        ...headers
    }
});

const isBypassRequested = (config) => {
    const cacheControl = config.headers?.['Cache-Control'] || config.headers?.['cache-control'];
    return config.kwiseBypassCache === true || String(cacheControl || '').toLowerCase().includes('no-cache');
};

export const installAxiosGetCache = (axiosInstance, options = {}) => {
    if (!axiosInstance?.interceptors?.request?.use) {
        return {
            clear: () => {},
            size: () => 0
        };
    }

    const ttlMs = Number.parseInt(options.ttlMs || DEFAULT_TTL_MS, 10);
    const maxEntries = Number.parseInt(options.maxEntries || DEFAULT_MAX_ENTRIES, 10);
    const cacheablePath = options.cacheablePath || (() => true);
    const responseCache = new Map();
    const inFlight = new Map();

    const prune = () => {
        while (responseCache.size > maxEntries) {
            responseCache.delete(responseCache.keys().next().value);
        }
    };

    axiosInstance.interceptors.request.use((config) => {
        if (String(config.method || 'get').toLowerCase() !== 'get' || ttlMs <= 0 || isBypassRequested(config)) {
            return config;
        }

        const url = new URL(config.url || '', config.baseURL || globalThis.location?.origin || 'http://localhost');
        if (!cacheablePath(url.pathname, config)) {
            return config;
        }

        const key = buildCacheKey(config);
        const cached = responseCache.get(key);
        if (cached && cached.expiresAt > now()) {
            config.adapter = async () => cloneResponse(cached.response, config, { 'x-kwise-client-cache': 'hit' });
            return config;
        }

        if (cached) {
            responseCache.delete(key);
        }

        const pending = inFlight.get(key);
        if (pending) {
            config.adapter = async () => cloneResponse(await pending, config, { 'x-kwise-client-cache': 'coalesced' });
            return config;
        }

        let resolvePending;
        let rejectPending;
        const pendingPromise = new Promise((resolve, reject) => {
            resolvePending = resolve;
            rejectPending = reject;
        });
        pendingPromise.catch(() => {});
        inFlight.set(key, pendingPromise);
        config.kwiseGetCache = { key, resolvePending, rejectPending };
        return config;
    });

    axiosInstance.interceptors.response.use(
        (response) => {
            const cacheMeta = response.config?.kwiseGetCache;
            if (cacheMeta) {
                responseCache.set(cacheMeta.key, {
                    response: cloneResponse(response, response.config, { 'x-kwise-client-cache': 'miss' }),
                    expiresAt: now() + ttlMs
                });
                prune();
                cacheMeta.resolvePending(response);
                inFlight.delete(cacheMeta.key);
            }

            return response;
        },
        (error) => {
            const cacheMeta = error.config?.kwiseGetCache;
            if (cacheMeta) {
                cacheMeta.rejectPending(error);
                inFlight.delete(cacheMeta.key);
            }

            return Promise.reject(error);
        }
    );

    return {
        clear: () => responseCache.clear(),
        stats: () => ({
            entries: responseCache.size,
            inFlight: inFlight.size,
            ttlMs,
            maxEntries
        })
    };
};
