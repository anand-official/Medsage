'use client';

import AppShellLayout from '../AppShellLayout';
import ProtectedGate from '../ProtectedGate';
import QuestionPage from '../../pages/QuestionPage';

export default function QuestionRouteInner() {
  return (
    <ProtectedGate>
      <AppShellLayout>
        <QuestionPage />
      </AppShellLayout>
    </ProtectedGate>
  );
}

