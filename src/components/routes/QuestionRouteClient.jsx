'use client';

import { useEffect, useState } from 'react';

function QuestionLoading() {
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
      Loading Cortex...
    </main>
  );
}

export default function QuestionRouteClient() {
  const [QuestionRouteInner, setQuestionRouteInner] = useState(null);

  useEffect(() => {
    let mounted = true;

    import('./QuestionRouteInner').then((module) => {
      if (mounted) {
        setQuestionRouteInner(() => module.default);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!QuestionRouteInner) {
    return <QuestionLoading />;
  }

  return <QuestionRouteInner />;
}

