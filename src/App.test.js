import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAuth = jest.fn();

jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => mockUseAuth(),
}));

jest.mock('./contexts/StudyContext', () => ({
  StudyProvider: ({ children }) => children,
}));

jest.mock('./components/Layout', () => {
  const { Outlet } = require('react-router-dom');
  return function MockLayout() {
    return (
      <div data-testid="layout-shell">
        <Outlet />
      </div>
    );
  };
});

jest.mock('./components/ErrorBoundary', () => ({ children }) => children);
jest.mock('./pages/HomePage', () => () => <div>home-page</div>);
jest.mock('./pages/QuestionPage', () => () => <div>question-page</div>);
jest.mock('./pages/StudyPlannerPage', () => () => <div>study-planner-page</div>);
jest.mock('./pages/BookReferencePage', () => () => <div>book-reference-page</div>);
jest.mock('./pages/NotFoundPage', () => () => <div>not-found-page</div>);
jest.mock('./components/SignIn', () => () => <div>sign-in-page</div>);
jest.mock('./pages/ProfilePage', () => () => <div>profile-page</div>);
jest.mock('./pages/ReviewSession', () => () => <div>review-session-page</div>);
jest.mock('./pages/SystemStatusPage', () => () => <div>system-status-page</div>);
jest.mock('./components/auth/Onboarding', () => () => null);
jest.mock('./pages/LandingPage', () => () => <div>landing-page</div>);
jest.mock('./pages/TeamPage', () => () => <div>team-page</div>);

import App from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/');
  mockUseAuth.mockReturnValue({ currentUser: null, authStatus: 'signed_out' });
});

test('redirects signed-out users to the landing page', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<App />);
  });

  expect(container.textContent).toContain('landing-page');

  await act(async () => {
    root.unmount();
  });
  container.remove();
});

test('renders degraded auth recovery state for protected routes', async () => {
  mockUseAuth.mockReturnValue({
    currentUser: { uid: 'u1' },
    authStatus: 'degraded',
    authError: 'backend unavailable',
    retryBootstrap: jest.fn(),
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<App />);
  });

  expect(container.textContent).toContain('We could not load your account');
  expect(container.textContent).toContain('backend unavailable');
  expect(container.textContent).toContain('Open Status');

  await act(async () => {
    root.unmount();
  });
  container.remove();
});

test('renders the status route without requiring an authenticated session', async () => {
  window.history.pushState({}, '', '/status');

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<App />);
  });

  expect(container.textContent).toContain('system-status-page');

  await act(async () => {
    root.unmount();
  });
  container.remove();
});
