import {
  getSessionStoredValue,
  getStoredValue,
  removeSessionStoredValue,
  removeStoredValue,
  setStoredValue,
  setSessionStoredValue,
} from './browser';

export const AUTH_TOKEN_STORAGE_KEY = 'google_id_token';

export function getAuthToken() {
  return getSessionStoredValue(AUTH_TOKEN_STORAGE_KEY) || getStoredValue(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token) {
  if (!token) return false;
  const stored = setSessionStoredValue(AUTH_TOKEN_STORAGE_KEY, token);
  // Prefer sessionStorage, but fall back to localStorage for constrained
  // in-app browsers where sessionStorage can be unavailable or unreliable.
  if (stored) {
    removeStoredValue(AUTH_TOKEN_STORAGE_KEY);
    return true;
  }

  return setStoredValue(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  removeSessionStoredValue(AUTH_TOKEN_STORAGE_KEY);
  removeStoredValue(AUTH_TOKEN_STORAGE_KEY);
}

export function migrateLegacyAuthToken() {
  const sessionToken = getSessionStoredValue(AUTH_TOKEN_STORAGE_KEY);
  if (sessionToken) return sessionToken;

  const legacyToken = getStoredValue(AUTH_TOKEN_STORAGE_KEY);
  if (!legacyToken) return null;

  const migrated = setSessionStoredValue(AUTH_TOKEN_STORAGE_KEY, legacyToken);
  if (migrated) {
    removeStoredValue(AUTH_TOKEN_STORAGE_KEY);
  }
  return legacyToken;
}
