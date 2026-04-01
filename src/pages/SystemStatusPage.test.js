import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAuth = jest.fn();
const mockUseStudyContext = jest.fn();
const mockNavigate = jest.fn();
const mockGetHealthStatus = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../contexts/StudyContext', () => ({
  useStudyContext: () => mockUseStudyContext(),
}));

jest.mock('../services/api', () => {
  return {
    formatRequestIdLabel: (requestId) => (requestId ? `Request ID: ${requestId}` : ''),
    systemAPI: {
      getHealthStatus: () => mockGetHealthStatus(),
    },
  };
});

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import SystemStatusPage from './SystemStatusPage';

async function renderPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <SystemStatusPage />
        </MemoryRouter>
      </ThemeProvider>
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
  mockNavigate.mockReset();
  mockGetHealthStatus.mockReset();
  mockUseAuth.mockReturnValue({
    authStatus: 'authenticated',
    authError: null,
    retryBootstrap: jest.fn(),
  });
  mockUseStudyContext.mockReturnValue({
    planState: 'ready',
    todayState: 'ready',
    analyticsState: 'ready',
    planError: null,
    todayError: null,
    analyticsError: null,
    generateError: null,
  });
});

test('renders live health details on the system status page', async () => {
  mockGetHealthStatus.mockResolvedValue({
    data: {
      status: 'ok',
      service: 'cortex-api',
      uptime_s: 42,
      checks: {
        mongodb: 'ok',
        gemini: 'ok',
      },
    },
    statusCode: 200,
  });

  const { container, cleanup } = await renderPage();

  expect(container.textContent).toContain('System Status');
  expect(container.textContent).toContain('Operational Snapshot');
  expect(container.textContent).toContain('API: ok');
  expect(container.textContent).toContain('mongodb: ok');
  expect(container.textContent).toContain('cortex-api is reporting ok status');

  await cleanup();
});

test('shows health request IDs and allows degraded auth recovery', async () => {
  const retryBootstrap = jest.fn();
  const healthError = new Error('Health probe failed');
  healthError.requestId = 'rid-health-1';

  mockUseAuth.mockReturnValue({
    authStatus: 'degraded',
    authError: 'backend unavailable',
    retryBootstrap,
  });
  mockUseStudyContext.mockReturnValue({
    planState: 'error',
    todayState: 'ready',
    analyticsState: 'error',
    planError: 'Planner failed',
    todayError: null,
    analyticsError: 'Analytics failed',
    generateError: null,
  });
  mockGetHealthStatus.mockRejectedValue(healthError);

  const { container, cleanup } = await renderPage();

  expect(container.textContent).toContain('Retry Account Bootstrap');
  expect(container.textContent).toContain('Failures: 3');
  expect(container.textContent).toContain('Request ID: rid-health-1');

  const retryButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('Retry Account Bootstrap')
  );

  await act(async () => {
    retryButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(retryBootstrap).toHaveBeenCalled();

  await cleanup();
});
