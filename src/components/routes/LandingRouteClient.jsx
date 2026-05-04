'use client';

import dynamic from 'next/dynamic';

import { useNextNavigation } from '../NextNavigationBridge';

const LandingPage = dynamic(() => import('../../pages/LandingPage'), {
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
      Loading Medsage...
    </main>
  ),
});

export default function LandingRouteClient() {
  const navigation = useNextNavigation();
  return <LandingPage navigation={navigation} />;
}

