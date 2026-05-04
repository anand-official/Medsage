'use client';

import AppShellLayout from './AppShellLayout';
import ProtectedGate from './ProtectedGate';
import HomePage from '../pages/HomePage';

export default function HomeRouteInner() {
  return (
    <ProtectedGate>
      <AppShellLayout>
        <HomePage />
      </AppShellLayout>
    </ProtectedGate>
  );
}
