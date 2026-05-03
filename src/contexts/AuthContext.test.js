import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './AuthContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockCreateOrUpdateUser = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockUpdateProfile = jest.fn();
const mockDeleteAccount = jest.fn();
let mockAuthInvalidationHandler = null;

jest.mock('../services/api', () => ({
  authAPI: {
    createOrUpdateUser: (...args) => mockCreateOrUpdateUser(...args),
    updatePreferences: (...args) => mockUpdatePreferences(...args),
    updateProfile: (...args) => mockUpdateProfile(...args),
    deleteAccount: (...args) => mockDeleteAccount(...args),
  },
  formatRequestIdLabel: (requestId) => (requestId ? `Request ID: ${requestId}` : ''),
  registerAuthInvalidationHandler: (handler) => {
    mockAuthInvalidationHandler = handler;
    return () => {
      if (mockAuthInvalidationHandler === handler) {
        mockAuthInvalidationHandler = null;
      }
    };
  },
}));

const mockClearAuthToken = jest.fn();
const mockGetAuthToken = jest.fn();
const mockMigrateLegacyAuthToken = jest.fn();
const mockSetAuthToken = jest.fn();

jest.mock('../utils/authStorage', () => ({
  clearAuthToken: (...args) => mockClearAuthToken(...args),
  getAuthToken: (...args) => mockGetAuthToken(...args),
  migrateLegacyAuthToken: (...args) => mockMigrateLegacyAuthToken(...args),
  setAuthToken: (...args) => mockSetAuthToken(...args),
}));

jest.mock('@react-oauth/google', () => ({
  googleLogout: jest.fn(),
}));

let storedToken = null;
let latestAuth = null;

function buildToken(payloadOverrides = {}) {
  const payload = {
    sub: 'user-1',
    email: 'student@example.com',
    name: 'Student One',
    picture: 'https://example.com/u.png',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payloadOverrides,
  };

  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `header.${encodedPayload}.signature`;
}

function Observer() {
  latestAuth = useAuth();
  return <div>{latestAuth.authStatus}</div>;
}

async function renderAuthProvider() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );
  });

  await act(async () => {
    await Promise.resolve();
  });

  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

beforeEach(() => {
  storedToken = null;
  latestAuth = null;
  mockAuthInvalidationHandler = null;
  mockCreateOrUpdateUser.mockReset();
  mockUpdatePreferences.mockReset();
  mockUpdateProfile.mockReset();
  mockDeleteAccount.mockReset();
  mockClearAuthToken.mockReset();
  mockGetAuthToken.mockReset();
  mockGetAuthToken.mockImplementation(() => storedToken);
  mockMigrateLegacyAuthToken.mockReset();
  mockMigrateLegacyAuthToken.mockImplementation(() => storedToken);
  mockSetAuthToken.mockReset();
  mockSetAuthToken.mockImplementation((token) => {
    storedToken = token;
    return true;
  });
});

test('boots into signed_out when no stored token exists', async () => {
  const { cleanup } = await renderAuthProvider();

  expect(latestAuth.authStatus).toBe('signed_out');
  expect(latestAuth.currentUser).toBe(null);

  await cleanup();
});

test('bootstraps into authenticated with a valid stored Google token', async () => {
  storedToken = buildToken();
  mockCreateOrUpdateUser.mockResolvedValue({
    data: { uid: 'user-1', email: 'student@example.com' },
  });

  const { cleanup } = await renderAuthProvider();

  expect(latestAuth.authStatus).toBe('authenticated');
  expect(latestAuth.currentUser).toMatchObject({
    uid: 'user-1',
    email: 'student@example.com',
  });
  expect(latestAuth.userProfile).toMatchObject({
    uid: 'user-1',
  });

  await cleanup();
});

test('falls back to signed_out on bootstrap 401 without leaving the overlay stuck', async () => {
  storedToken = buildToken();
  mockCreateOrUpdateUser.mockRejectedValue({
    statusCode: 401,
    message: 'Unauthorized',
  });

  const { cleanup } = await renderAuthProvider();

  expect(latestAuth.authStatus).toBe('signed_out');
  expect(latestAuth.currentUser).toBe(null);
  expect(mockClearAuthToken).toHaveBeenCalled();

  await cleanup();
});

test('moves to degraded when bootstrap fails with a retryable backend error', async () => {
  storedToken = buildToken();
  mockCreateOrUpdateUser.mockRejectedValue({
    statusCode: 503,
    retryable: true,
    requestId: 'rid-auth-503',
    message: 'Service unavailable',
  });

  const { cleanup } = await renderAuthProvider();

  expect(latestAuth.authStatus).toBe('degraded');
  expect(latestAuth.authError).toContain('We could not reach your Medsage account.');
  expect(latestAuth.authError).toContain('Request ID: rid-auth-503');

  await cleanup();
});

test('moves to degraded when account bootstrap never resolves', async () => {
  jest.useFakeTimers();
  const token = buildToken();
  mockCreateOrUpdateUser.mockImplementation(() => new Promise(() => {}));

  const { cleanup } = await renderAuthProvider();

  let result;
  await act(async () => {
    result = latestAuth.handleGoogleSuccess({ credential: token });
  });

  await act(async () => {
    jest.advanceTimersByTime(15000);
    await result;
  });

  await expect(result).resolves.toBe('degraded');
  expect(latestAuth.authStatus).toBe('degraded');
  expect(latestAuth.authError).toContain('too long to respond');

  await cleanup();
  jest.useRealTimers();
});

test('superseded bootstraps resolve without leaving authStatus stuck on loading', async () => {
  const tokenOne = buildToken({ sub: 'user-1', email: 'first@example.com', name: 'First User' });
  const tokenTwo = buildToken({ sub: 'user-2', email: 'second@example.com', name: 'Second User' });
  const pendingCalls = [];

  mockCreateOrUpdateUser.mockImplementation((_, options = {}) => new Promise((resolve, reject) => {
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        reject(Object.assign(new Error('canceled'), { name: 'CanceledError', code: 'ERR_CANCELED' }));
      }, { once: true });
    }
    pendingCalls.push({ resolve, reject });
  }));

  const { cleanup } = await renderAuthProvider();

  let firstResult;
  await act(async () => {
    firstResult = latestAuth.handleGoogleSuccess({ credential: tokenOne });
  });

  let secondResult;
  await act(async () => {
    secondResult = latestAuth.handleGoogleSuccess({ credential: tokenTwo });
  });

  await act(async () => {
    pendingCalls[1].resolve({
      data: { uid: 'user-2', email: 'second@example.com' },
    });
    await secondResult;
  });

  await expect(firstResult).resolves.toBe('aborted');
  expect(latestAuth.authStatus).toBe('authenticated');
  expect(latestAuth.currentUser).toMatchObject({
    uid: 'user-2',
    email: 'second@example.com',
  });

  await cleanup();
});

test('auth invalidation handler signs the user out after they were authenticated', async () => {
  storedToken = buildToken();
  mockCreateOrUpdateUser.mockResolvedValue({
    data: { uid: 'user-1', email: 'student@example.com' },
  });

  const { cleanup } = await renderAuthProvider();

  expect(latestAuth.authStatus).toBe('authenticated');

  await act(async () => {
    mockAuthInvalidationHandler?.({
      endpoint: '/api/v1/study/plan',
      requestId: 'rid-401',
      reason: 'unauthorized',
    });
  });

  expect(latestAuth.authStatus).toBe('signed_out');
  expect(latestAuth.currentUser).toBe(null);
  expect(mockClearAuthToken).toHaveBeenCalled();

  await cleanup();
});
