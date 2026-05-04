'use client';

import dynamic from 'next/dynamic';

const HomeRouteInner = dynamic(() => import('./HomeRouteInner'), {
  ssr: false,
  loading: () => (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#040406',
      color: 'rgba(255,255,255,0.6)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      Loading Medsage...
    </main>
  ),
});

export default function HomeRouteClient() {
  return <HomeRouteInner />;
}
