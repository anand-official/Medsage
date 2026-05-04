'use client';

import AppShellLayout from '../AppShellLayout';
import { useNextNavigation } from '../NextNavigationBridge';
import SystemStatusPage from '../../pages/SystemStatusPage';

export default function StatusRouteInner() {
  const navigation = useNextNavigation();

  return (
    <AppShellLayout>
      <SystemStatusPage navigation={navigation} />
    </AppShellLayout>
  );
}

