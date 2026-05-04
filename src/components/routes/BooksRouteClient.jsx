'use client';

import dynamic from 'next/dynamic';

const BooksRouteInner = dynamic(() => import('./BooksRouteInner'), {
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
      Loading library...
    </main>
  ),
});

export default function BooksRouteClient() {
  return <BooksRouteInner />;
}

