import React from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStudyContext } from '../contexts/StudyContext';
import SystemDiagnosticsPanel from '../components/system/SystemDiagnosticsPanel';

export default function SystemStatusPage() {
  const navigate = useNavigate();
  const { authStatus, authError, retryBootstrap } = useAuth();
  const {
    planState,
    todayState,
    analyticsState,
    planError,
    todayError,
    analyticsError,
    generateError,
  } = useStudyContext();

  const failureCount = [
    authStatus === 'degraded',
    planState === 'error',
    todayState === 'error',
    analyticsState === 'error',
  ].filter(Boolean).length;

  const latestIssue = authError || planError || todayError || analyticsError || generateError || null;

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', pb: 8 }}>
      <Typography variant="h3" fontWeight={900} sx={{ mb: 1 }}>
        System Status
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Use this page to check account bootstrap state, planner health, build version, and backend reachability before debugging a broken study flow.
      </Typography>

      {authStatus === 'degraded' && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          Your account is signed in locally, but Medsage could not finish backend bootstrap. Retry before using planner or profile features.
        </Alert>
      )}

      <SystemDiagnosticsPanel
        dataTestId="system-status-panel"
        title="Operational Snapshot"
        subtitle="This surface consolidates the current client state with a live API health check."
        authStatus={authStatus}
        planState={planState}
        todayState={todayState}
        analyticsState={analyticsState}
        latestIssue={latestIssue}
        failureCount={failureCount}
        showHealthDetails
        actions={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {authStatus === 'degraded' && (
              <Button size="small" variant="contained" onClick={retryBootstrap}>
                Retry Account Bootstrap
              </Button>
            )}
            <Button size="small" variant="text" onClick={() => navigate('/planner')}>
              Open Planner
            </Button>
          </Stack>
        )}
      />
    </Box>
  );
}
