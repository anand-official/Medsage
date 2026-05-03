'use client';

import { useEffect, useState } from 'react';

function PlannerLoading() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#040406',
      color: 'rgba(255,255,255,0.68)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      Loading planner...
    </main>
  );
}

export default function PlannerRouteClient() {
  const [PlannerRouteInner, setPlannerRouteInner] = useState(null);

  useEffect(() => {
    let mounted = true;

    import('./PlannerRouteInner').then((module) => {
      if (mounted) {
        setPlannerRouteInner(() => module.default);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!PlannerRouteInner) {
    return <PlannerLoading />;
  }

  return <PlannerRouteInner />;
}
