'use client';

import dynamic from 'next/dynamic';

const ReviewRouteInner = dynamic(() => import('./ReviewRouteInner'), {
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
      Loading review...
    </main>
  ),
});

export default function ReviewRouteClient() {
  return <ReviewRouteInner />;
}

