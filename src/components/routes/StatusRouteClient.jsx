'use client';

import dynamic from 'next/dynamic';

const StatusRouteInner = dynamic(() => import('./StatusRouteInner'), {
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
      Loading status...
    </main>
  ),
});

export default function StatusRouteClient() {
  return <StatusRouteInner />;
}

