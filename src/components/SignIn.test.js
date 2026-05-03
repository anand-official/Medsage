import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SignIn from './SignIn';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAuth = jest.fn();
const mockUseGoogleOAuthRuntime = jest.fn();
const mockNavigate = jest.fn();
const mockConsumePostAuthRedirect = jest.fn();
const mockGetHistoryRedirectState = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../contexts/GoogleOAuthContext', () => ({
  useGoogleOAuthRuntime: () => mockUseGoogleOAuthRuntime(),
}));

jest.mock('../utils/authRedirect', () => ({
  consumePostAuthRedirect: () => mockConsumePostAuthRedirect(),
}));

jest.mock('../utils/navigation', () => ({
  getHistoryRedirectState: () => mockGetHistoryRedirectState(),
  navigateTo: jest.fn(),
}));

jest.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }) => (
    <div>
      <button type="button" onClick={() => onSuccess({ credential: 'google-credential' })}>
        Mock Google Success
      </button>
      <button type="button" onClick={() => onError()}>
        Mock Google Error
      </button>
    </div>
  ),
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: new Proxy({}, {
      get: (_, tag) => ({ children, ...props }) => React.createElement(tag, props, children),
    }),
  };
});

async function renderSignIn(navigation = { navigate: mockNavigate }) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<SignIn navigation={navigation} />);
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
  mockNavigate.mockReset();
  mockConsumePostAuthRedirect.mockReset();
  mockGetHistoryRedirectState.mockReset();
  mockConsumePostAuthRedirect.mockReturnValue('/planner');
  mockGetHistoryRedirectState.mockReturnValue(null);
  mockUseAuth.mockReturnValue({
    handleGoogleSuccess: jest.fn().mockResolvedValue('authenticated'),
    authStatus: 'signed_out',
    currentUser: null,
  });
  mockUseGoogleOAuthRuntime.mockReturnValue({
    clientId: 'google-client-id',
    loading: false,
    error: '',
    unavailable: false,
  });
});

test('shows the Google config loading state while runtime auth config is loading', async () => {
  mockUseGoogleOAuthRuntime.mockReturnValue({
    clientId: '',
    loading: true,
    error: '',
    unavailable: false,
  });

  const { container, cleanup } = await renderSignIn();

  expect(container.textContent).toContain('Loading Google sign-in...');

  await cleanup();
});

test('shows a clear unavailable message and no local dev fallback when Google auth is unavailable', async () => {
  mockUseGoogleOAuthRuntime.mockReturnValue({
    clientId: '',
    loading: false,
    error: 'Google sign-in is unavailable right now.',
    unavailable: true,
  });

  const { container, cleanup } = await renderSignIn();

  expect(container.textContent).toContain('Google sign-in is unavailable right now.');
  expect(container.textContent).not.toContain('Continue in local dev');

  await cleanup();
});

test('returns planner sign-ins to the protected planner route', async () => {
  const handleGoogleSuccess = jest.fn().mockResolvedValue('authenticated');
  mockUseAuth.mockReturnValue({
    handleGoogleSuccess,
    authStatus: 'signed_out',
    currentUser: null,
  });

  const { container, cleanup } = await renderSignIn();

  const googleButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('Mock Google Success')
  );

  await act(async () => {
    googleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(handleGoogleSuccess).toHaveBeenCalledWith({ credential: 'google-credential' });
  expect(mockNavigate).toHaveBeenCalledWith('/planner', { replace: true });

  await cleanup();
});

test('navigates to the upgraded dashboard when no redirect is stored', async () => {
  mockConsumePostAuthRedirect.mockReturnValue(null);
  const handleGoogleSuccess = jest.fn().mockResolvedValue('authenticated');
  mockUseAuth.mockReturnValue({
    handleGoogleSuccess,
    authStatus: 'signed_out',
    currentUser: null,
  });

  const { container, cleanup } = await renderSignIn();

  const googleButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('Mock Google Success')
  );

  await act(async () => {
    googleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });

  await cleanup();
});

test('preserves the planner redirect from session storage', async () => {
  mockConsumePostAuthRedirect.mockReturnValue('/planner');
  const handleGoogleSuccess = jest.fn().mockResolvedValue('authenticated');
  mockUseAuth.mockReturnValue({
    handleGoogleSuccess,
    authStatus: 'signed_out',
    currentUser: null,
  });

  const { container, cleanup } = await renderSignIn();

  const googleButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('Mock Google Success')
  );

  await act(async () => {
    googleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(mockNavigate).toHaveBeenCalledWith('/planner', { replace: true });

  await cleanup();
});

test('preserves the question redirect from session storage', async () => {
  mockConsumePostAuthRedirect.mockReturnValue('/question');
  const handleGoogleSuccess = jest.fn().mockResolvedValue('authenticated');
  mockUseAuth.mockReturnValue({
    handleGoogleSuccess,
    authStatus: 'signed_out',
    currentUser: null,
  });

  const { container, cleanup } = await renderSignIn();

  const googleButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('Mock Google Success')
  );

  await act(async () => {
    googleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(mockNavigate).toHaveBeenCalledWith('/question', { replace: true });

  await cleanup();
});

test('keeps the updated sign-in page visible while auth bootstrap is loading', async () => {
  mockUseAuth.mockReturnValue({
    handleGoogleSuccess: jest.fn(),
    authStatus: 'loading',
    currentUser: null,
  });

  const { container, cleanup } = await renderSignIn();

  expect(container.textContent).toContain('Opening dashboard...');
  expect(container.textContent).toContain('Welcome back');

  await cleanup();
});
