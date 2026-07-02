const crypto = require('node:crypto');

const CSRF_COOKIE_NAME = 'kwise_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const createCsrfToken = () => crypto.randomBytes(32).toString('hex');

const getCookieOptions = () => ({
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
});

const setCsrfCookie = (res, token = createCsrfToken()) => {
    res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
    return token;
};

const clearCsrfCookie = (res) => {
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
};

const timingSafeEqualString = (left, right) => {
    if (typeof left !== 'string' || typeof right !== 'string') {
        return false;
    }

    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const shouldSkipCsrf = (req) => {
    if (SAFE_METHODS.has(req.method)) {
        return true;
    }

    if (process.env.NODE_ENV === 'test' && process.env.BYPASS_AUTH_FOR_TESTS === 'true') {
        return true;
    }

    const path = req.path || '';
    if (path.startsWith('/api/compatibility/cache')) {
        return false;
    }

    return path.startsWith('/api/kiosk')
        || path.startsWith('/api/services')
        || path.startsWith('/api/prebuilt')
        || path.startsWith('/api/products')
        || path.startsWith('/api/compatibility')
        || path.startsWith('/api/pc-upgrade');
};

const csrfProtection = (req, res, next) => {
    if (shouldSkipCsrf(req) || !req.cookies?.jwt) {
        return next();
    }

    const csrfCookie = req.cookies[CSRF_COOKIE_NAME];
    const csrfHeader = req.get(CSRF_HEADER_NAME);

    if (!timingSafeEqualString(csrfCookie, csrfHeader)) {
        return res.status(403).json({
            status: 'fail',
            code: 'CSRF_TOKEN_INVALID',
            message: 'Security token is missing or invalid. Please refresh and try again.'
        });
    }

    return next();
};

module.exports = {
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    createCsrfToken,
    setCsrfCookie,
    clearCsrfCookie,
    csrfProtection
};
