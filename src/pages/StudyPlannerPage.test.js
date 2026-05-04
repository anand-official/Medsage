import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseStudyContext = jest.fn();
const mockNavigate = jest.fn();
let lastPlannerSetupProps = null;

jest.mock('../contexts/StudyContext', () => ({
  useStudyContext: () => mockUseStudyContext(),
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ authStatus: 'authenticated' }),
}));

jest.mock('../components/planner/PlannerSetup', () => (props) => {
  lastPlannerSetupProps = props;
  return <div>planner-setup</div>;
});
jest.mock('../components/planner/TodoList', () => () => <div>todo-list</div>);
jest.mock('../components/planner/ProgressRing', () => () => <div>progress-ring</div>);
jest.mock('../components/planner/PerformanceChart', () => () => <div>performance-chart</div>);
jest.mock('../components/planner/StreakCounter', () => () => <div>streak-counter</div>);
jest.mock('../components/planner/GoalTimeline', () => () => <div>goal-timeline</div>);
jest.mock('../components/planner/PlanCoach', () => () => <div>plan-coach</div>);
jest.mock('../components/system/SystemDiagnosticsPanel', () => ({ actions }) => (
  <div>
    system-diagnostics-panel
    {actions}
  </div>
));

jest.mock('@mui/x-date-pickers', () => ({
  DateCalendar: () => <div>date-calendar</div>,
  PickersDay: () => <div>pickers-day</div>,
}));

jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }) => <div>{children}</div>,
}));

jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: function AdapterDateFns() {},
}));

jest.mock('framer-motion', () => {
  const React = require('react');

  const motion = new Proxy({}, {
    get: (_, tag) => React.forwardRef(({ children, ...props }, ref) =>
      React.createElement(tag, { ...props, ref }, children)),
  });

  return {
    motion,
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

jest.mock('../utils/navigation', () => ({
  useNavigate: () => mockNavigate,
  navigateTo: jest.fn(),
}));

import StudyPlannerPage from './StudyPlannerPage';

async function renderPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <ThemeProvider theme={createTheme()}>
        <StudyPlannerPage />
      </ThemeProvider>
    );
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

const baseContext = {
  studyPlan: {
    _id: 'plan-1',
    advisory_text: 'Focus on weak areas.',
    daily_plan: [
      {
        date: '2030-01-01',
        tasks: [{ id: 't1', text: 'Task', topic: 'Topic', completed: false, resources: [] }],
      },
    ],
    goals: {},
  },
  getStudyPlan: jest.fn(async () => null),
  fetchToday: jest.fn(async () => null),
  fetchAnalytics: jest.fn(async () => null),
  fetchDailyAdvisory: jest.fn(async () => null),
  rebalancePlan: jest.fn(async () => ({ moved: [] })),
  tickTask: jest.fn(),
  todayData: { tasks: [], streak: { current: 0 } },
  analyticsData: { streak: { current: 0 }, heatmap: [], goals: {} },
  planState: 'ready',
  todayState: 'ready',
  analyticsState: 'ready',
  planLoading: false,
  generateError: null,
  planError: null,
  todayError: null,
  analyticsError: null,
};

beforeEach(() => {
  mockNavigate.mockReset();
  lastPlannerSetupProps = null;
  mockUseStudyContext.mockReturnValue({
    ...baseContext,
    getStudyPlan: jest.fn(async () => baseContext.studyPlan),
    fetchToday: jest.fn(async () => baseContext.todayData),
    fetchAnalytics: jest.fn(async () => baseContext.analyticsData),
  });
});

test('renders planner retry state when plan load failed', async () => {
  const retryGetStudyPlan = jest.fn(async () => undefined);
  mockUseStudyContext.mockReturnValue({
    ...baseContext,
    studyPlan: null,
    planState: 'error',
    planError: 'planner failed',
    getStudyPlan: retryGetStudyPlan,
  });

  const { container, cleanup } = await renderPage();

  expect(container.textContent).toContain('planner failed');
  expect(container.textContent).toContain('Retry Planner Load');

  const button = container.querySelector('button');
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  expect(retryGetStudyPlan).toHaveBeenCalled();

  await cleanup();
});

test('renders planner setup when no plan exists', async () => {
  mockUseStudyContext.mockReturnValue({
    ...baseContext,
    studyPlan: null,
    planState: 'empty',
  });

  const { container, cleanup } = await renderPage();

  expect(container.textContent).toContain('planner-setup');

  await cleanup();
});

test('renders partial failure warning and diagnostics while keeping planner visible', async () => {
  mockUseStudyContext.mockReturnValue({
    ...baseContext,
    getStudyPlan: jest.fn(async () => baseContext.studyPlan),
    fetchToday: jest.fn(async () => null),
    fetchAnalytics: jest.fn(async () => null),
    todayState: 'error',
    todayError: 'today unavailable Request ID: rid-123',
  });

  const { container, cleanup } = await renderPage();

  expect(container.textContent).toContain('Study');
  expect(container.textContent).toContain('today unavailable Request ID: rid-123');
  expect(container.textContent).toContain('system-diagnostics-panel');
  expect(container.textContent).toContain('Open Full Status');
  expect(container.textContent).toContain('todo-list');

  await cleanup();
});

test('shows the generated planner immediately after setup success without waiting for a remount', async () => {
  mockUseStudyContext.mockReturnValue({
    ...baseContext,
    studyPlan: null,
    planState: 'empty',
  });

  const generatedPlan = {
    _id: 'plan-new',
    advisory_text: 'Generated now.',
    daily_plan: [
      {
        date: '2030-01-01',
        tasks: [{ id: 't-generated', text: 'Generated Task', topic: 'Generated Topic', completed: false, resources: [] }],
      },
    ],
    goals: {},
  };

  const { container, cleanup } = await renderPage();

  expect(container.textContent).toContain('planner-setup');

  await act(async () => {
    lastPlannerSetupProps.onGenerated(generatedPlan);
  });

  expect(container.textContent).toContain('Study');
  expect(container.textContent).toContain('todo-list');
  expect(container.textContent).not.toContain('planner-setup');

  await cleanup();
});
