jest.mock('./browser', () => ({
  getSessionStoredValue: jest.fn(() => null),
  removeSessionStoredValue: jest.fn(),
  setSessionStoredValue: jest.fn(() => true),
}));

import {
  clearPostAuthRedirect,
  consumePostAuthRedirect,
  setPostAuthRedirect,
} from './authRedirect';
import {
  getSessionStoredValue,
  removeSessionStoredValue,
  setSessionStoredValue,
} from './browser';

describe('authRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionStoredValue.mockReturnValue(null);
    setSessionStoredValue.mockReturnValue(true);
  });

  test('stores safe redirect paths in session storage', () => {
    const result = setPostAuthRedirect('/planner?tab=today');

    expect(result).toBe(true);
    expect(setSessionStoredValue).toHaveBeenCalledWith('post_auth_redirect', '/planner?tab=today');
  });

  test('does not store unsafe or sign-in redirect paths', () => {
    expect(setPostAuthRedirect('https://evil.example')).toBe(false);
    expect(setPostAuthRedirect('//evil.example')).toBe(false);
    expect(setPostAuthRedirect('/signin')).toBe(false);
    expect(setSessionStoredValue).not.toHaveBeenCalled();
  });

  test('consumes and clears a safe stored redirect path', () => {
    getSessionStoredValue.mockReturnValue('/question#latest');

    const result = consumePostAuthRedirect();

    expect(result).toBe('/question#latest');
    expect(removeSessionStoredValue).toHaveBeenCalledWith('post_auth_redirect');
  });

  test('drops an unsafe stored redirect path', () => {
    getSessionStoredValue.mockReturnValue('https://evil.example');

    const result = consumePostAuthRedirect();

    expect(result).toBe(null);
    expect(removeSessionStoredValue).toHaveBeenCalledWith('post_auth_redirect');
  });

  test('clearPostAuthRedirect removes the stored redirect', () => {
    clearPostAuthRedirect();
    expect(removeSessionStoredValue).toHaveBeenCalledWith('post_auth_redirect');
  });
});
