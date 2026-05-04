'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

export function useNextNavigation() {
  const router = useRouter();

  return useMemo(() => ({
    navigate: (path, options = {}) => {
      if (!path) return;
      if (options.replace) {
        router.replace(path);
        return;
      }
      router.push(path);
    },
  }), [router]);
}

