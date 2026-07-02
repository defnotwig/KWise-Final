import { getCsrfToken, isMutatingMethod, withCsrfHeader } from '../utils/authSecurity';

describe('authSecurity helpers', () => {
  beforeEach(() => {
    document.cookie = 'kwise_csrf=csrf-test; path=/';
  });

  test('reads csrf token from cookie', () => {
    expect(getCsrfToken()).toBe('csrf-test');
  });

  test('adds csrf header only for mutating methods', () => {
    expect(isMutatingMethod('GET')).toBe(false);
    expect(isMutatingMethod('POST')).toBe(true);
    expect(withCsrfHeader({}, 'GET')).toEqual({});
    expect(withCsrfHeader({}, 'PATCH')).toEqual({ 'X-CSRF-Token': 'csrf-test' });
  });
});
