import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ currentUser: null }),
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
jest.mock('./components/auth/Onboarding', () => () => null);
jest.mock('./pages/LandingPage', () => () => <div>landing-page</div>);
jest.mock('./pages/TeamPage', () => () => <div>team-page</div>);

import App from './App';

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
