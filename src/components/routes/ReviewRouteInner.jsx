'use client';

import AppShellLayout from '../AppShellLayout';
import ProtectedGate from '../ProtectedGate';
import ReviewSession from '../../pages/ReviewSession';

export default function ReviewRouteInner() {
  return (
    <ProtectedGate>
      <AppShellLayout>
        <ReviewSession />
      </AppShellLayout>
    </ProtectedGate>
  );
}

