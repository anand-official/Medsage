jest.mock('./browser', () => ({
  getSessionStoredValue: jest.fn(() => null),
  getStoredValue: jest.fn(() => null),
  removeSessionStoredValue: jest.fn(),
  removeStoredValue: jest.fn(),
  setSessionStoredValue: jest.fn(() => false),
  setStoredValue: jest.fn(() => true),
}));

import { clearAuthToken, setAuthToken } from './authStorage';
import {
  removeSessionStoredValue,
  removeStoredValue,
  setSessionStoredValue,
  setStoredValue,
} from './browser';

describe('authStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSessionStoredValue.mockReturnValue(false);
    setStoredValue.mockReturnValue(true);
  });

  test('falls back to localStorage when sessionStorage write fails', () => {
    const stored = setAuthToken('token-123');

    expect(stored).toBe(true);
    expect(setSessionStoredValue).toHaveBeenCalledWith('google_id_token', 'token-123');
    expect(setStoredValue).toHaveBeenCalledWith('google_id_token', 'token-123');
  });

  test('clearAuthToken removes both session and local copies', () => {
    clearAuthToken();
    expect(removeSessionStoredValue).toHaveBeenCalledWith('google_id_token');
    expect(removeStoredValue).toHaveBeenCalledWith('google_id_token');
  });
});
