import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../components/landing/CanvasParticles', () => () => <div>canvas-particles</div>);
jest.mock('../components/landing/TeamSection', () => () => <div>team-section</div>);

jest.mock('framer-motion', () => {
  const React = require('react');
  const stripMotionProps = (props) => {
    const {
      animate,
      exit,
      initial,
      layout,
      transition,
      variants,
      viewport,
      whileHover,
      whileInView,
      whileTap,
      ...domProps
    } = props;
    return domProps;
  };
  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: new Proxy({}, {
      get: (_, tag) => ({ children, ...props }) => React.createElement(tag, stripMotionProps(props), children),
    }),
    useScroll: () => ({ scrollYProgress: { on: jest.fn(), get: jest.fn(() => 0) } }),
    useTransform: () => 0,
  };
});

jest.mock('../utils/navigation', () => ({
  useNavigate: () => mockNavigate,
}));

import LandingPage from './LandingPage';

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseAuth.mockReturnValue({ currentUser: null, authStatus: 'signed_out' });
});

test('renders landing page when IntersectionObserver is unavailable', async () => {
  const originalIntersectionObserver = window.IntersectionObserver;
  delete window.IntersectionObserver;

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<LandingPage />);
  });

  expect(container.textContent).toContain('Medsage.ai');
  expect(container.textContent).toContain('Start Studying Free');
  expect(container.textContent).toContain('team-section');

  await act(async () => {
    root.unmount();
  });

  window.IntersectionObserver = originalIntersectionObserver;
  container.remove();
});

test('does not redirect during auth bootstrap when auth is still loading', async () => {
  mockUseAuth.mockReturnValue({
    currentUser: { uid: 'u1' },
    authStatus: 'loading',
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<LandingPage />);
  });

  expect(mockNavigate).not.toHaveBeenCalled();

  await act(async () => {
    root.unmount();
  });
  container.remove();
});
