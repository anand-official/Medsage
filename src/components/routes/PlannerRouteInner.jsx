'use client';

import AppShellLayout from '../AppShellLayout';
import ProtectedGate from '../ProtectedGate';
import StudyPlannerPage from '../../pages/StudyPlannerPage';

export default function PlannerRouteInner() {
  return (
    <ProtectedGate>
      <AppShellLayout>
        <StudyPlannerPage />
      </AppShellLayout>
    </ProtectedGate>
  );
}

