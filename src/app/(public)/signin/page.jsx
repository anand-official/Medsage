'use client';

import React, { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import SignIn from '../../../components/SignIn';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const navigation = useMemo(() => ({
    from,
    navigate: (path, options = {}) => {
      if (options.replace) {
        router.replace(path);
        return;
      }
      router.push(path);
    },
  }), [from, router]);

  return <SignIn navigation={navigation} />;
}

export default function SignInRoute() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#090514' }} />}>
      <SignInContent />
    </Suspense>
  );
}
