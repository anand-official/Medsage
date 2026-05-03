'use client';

import AppShellLayout from '../AppShellLayout';
import ProtectedGate from '../ProtectedGate';
import { useNextNavigation } from '../NextNavigationBridge';
import ProfilePage from '../../pages/ProfilePage';

export default function ProfileRouteInner() {
  const navigation = useNextNavigation();

  return (
    <ProtectedGate>
      <AppShellLayout>
        <ProfilePage navigation={navigation} />
      </AppShellLayout>
    </ProtectedGate>
  );
}

