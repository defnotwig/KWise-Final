const SENSITIVE_KEY_PATTERN = /(password|passwd|pass|token|secret|api[_-]?key|key[_-]?hash|authorization|cookie|csrf|session|otp|reset|verification|two[_-]?factor)/i;
const MAX_STRING_LENGTH = 512;
const MAX_ARRAY_LENGTH = 50;
const MAX_DEPTH = 6;

const maskSecret = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return '********';
};

const sanitizeForLog = (value, depth = 0) => {
  if (depth > MAX_DEPTH) {
    return '[MaxDepth]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]` : value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeForLog(item, depth + 1));
  }

  return Object.entries(value).reduce((safe, [key, entry]) => {
    safe[key] = SENSITIVE_KEY_PATTERN.test(key) ? maskSecret(entry) : sanitizeForLog(entry, depth + 1);
    return safe;
  }, {});
};

const sanitizeSettingsValue = (key, value) => {
  if (SENSITIVE_KEY_PATTERN.test(key) && (value === null || typeof value !== 'object')) {
    return maskSecret(value);
  }
  return sanitizeForLog(value);
};

const sanitizeSettingsObject = (settings = {}) => {
  if (!settings || typeof settings !== 'object') {
    return sanitizeSettingsValue('', settings);
  }

  return Object.entries(settings).reduce((safe, [key, value]) => {
    safe[key] = sanitizeSettingsValue(key, value);
    return safe;
  }, {});
};

const sanitizeAuditRow = (row = {}) => {
  const sanitized = sanitizeForLog(row);
  if (sanitized.session_id) sanitized.session_id = maskSecret(sanitized.session_id);
  if (sanitized.request_id) sanitized.request_id = maskSecret(sanitized.request_id);
  return sanitized;
};

module.exports = {
  SENSITIVE_KEY_PATTERN,
  maskSecret,
  sanitizeForLog,
  sanitizeSettingsValue,
  sanitizeSettingsObject,
  sanitizeAuditRow
};
