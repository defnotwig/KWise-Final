import axios from 'axios';

const CSRF_COOKIE_NAME = 'kwise_csrf';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let fetchDefaultsInstalled = false;
let axiosDefaultsInstalled = false;

export const getCookieValue = (name) => {
  if (typeof document === 'undefined') {
    return '';
  }

  return document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') || '';
};

export const getCsrfToken = () => decodeURIComponent(getCookieValue(CSRF_COOKIE_NAME));

export const isMutatingMethod = (method = 'GET') => MUTATING_METHODS.has(String(method).toUpperCase());

export const withCsrfHeader = (headers = {}, method = 'GET') => {
  if (!isMutatingMethod(method)) {
    return headers;
  }

  const token = getCsrfToken();
  if (!token) {
    return headers;
  }

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const nextHeaders = new Headers(headers);
    nextHeaders.set('X-CSRF-Token', token);
    return nextHeaders;
  }

  if (typeof headers.set === 'function') {
    headers.set('X-CSRF-Token', token);
    return headers;
  }

  return { ...headers, 'X-CSRF-Token': token };
};

export const clearLegacyAuthStorage = () => {
  ['token', 'authToken', 'currentUser', 'userRole', 'kwise_credentials'].forEach((key) => localStorage.removeItem(key));
};

export const stripLegacyAuthHeader = (headers = {}) => {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const nextHeaders = new Headers(headers);
    nextHeaders.delete('Authorization');
    nextHeaders.delete('authorization');
    return nextHeaders;
  }

  if (typeof headers.delete === 'function') {
    headers.delete('Authorization');
    headers.delete('authorization');
    return headers;
  }

  const { Authorization: _authorization, authorization: _lowerAuthorization, ...safeHeaders } = headers || {};
  return safeHeaders;
};

export const installCredentialedRequestDefaults = () => {
  axios.defaults.withCredentials = true;

  if (!axiosDefaultsInstalled) {
    axios.interceptors.request.use((config) => {
      config.withCredentials = true;
      config.headers = withCsrfHeader(stripLegacyAuthHeader(config.headers || {}), config.method);
      return config;
    });
    axiosDefaultsInstalled = true;
  }

  if (fetchDefaultsInstalled || typeof globalThis.fetch !== 'function') {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (resource, options = {}) => {
    const method = options.method || 'GET';
    const headers = withCsrfHeader(stripLegacyAuthHeader(options.headers || {}), method);
    return originalFetch(resource, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  fetchDefaultsInstalled = true;
};
