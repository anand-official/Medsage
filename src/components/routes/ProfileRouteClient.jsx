'use client';

import dynamic from 'next/dynamic';

const ProfileRouteInner = dynamic(() => import('./ProfileRouteInner'), {
  ssr: false,
  loading: () => (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#040406',
      color: 'rgba(255,255,255,0.68)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      Loading profile...
    </main>
  ),
});

export default function ProfileRouteClient() {
  return <ProfileRouteInner />;
}

