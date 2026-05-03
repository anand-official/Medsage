'use client';

import dynamic from 'next/dynamic';

import { useNextNavigation } from '../NextNavigationBridge';

const TeamPage = dynamic(() => import('../../pages/TeamPage'), {
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
      Loading team...
    </main>
  ),
});

export default function TeamRouteClient() {
  const navigation = useNextNavigation();
  return <TeamPage navigation={navigation} />;
}

