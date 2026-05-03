'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

import { useAuth } from '../contexts/AuthContext';
import { setPostAuthRedirect } from '../utils/authRedirect';

function buildRedirectTarget(pathname, searchParams) {
  const query = searchParams?.toString();
  return `${pathname || '/'}${query ? `?${query}` : ''}`;
}

export default function ProtectedGate({ children }) {
  const { currentUser, authStatus, authError, retryBootstrap } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectTarget = buildRedirectTarget(pathname, searchParams);

  useEffect(() => {
    if (authStatus === 'signed_out' && !currentUser) {
      setPostAuthRedirect(redirectTarget);
      router.replace('/signin');
    }
  }, [authStatus, currentUser, redirectTarget, router]);

  if (authStatus === 'loading') {
    return (
      <Box sx={{ position: 'fixed', inset: 0, background: '#040406', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={32} sx={{ color: '#6366f1' }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
          Signing you in...
        </Typography>
      </Box>
    );
  }

  if (authStatus === 'degraded') {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3 }}>
        <Box sx={{ maxWidth: 520, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
            We could not load your account
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {authError || 'Please retry account bootstrap before opening protected pages.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={retryBootstrap}>
              Retry
            </Button>
            <Button onClick={() => router.push('/status')} variant="outlined">
              Open Status
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  if (!currentUser) {
    return null;
  }

  return children;
}
