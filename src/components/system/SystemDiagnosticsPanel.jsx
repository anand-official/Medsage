import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { getApiBaseUrl } from '../../config/apiBase';
import { formatRequestIdLabel, systemAPI } from '../../services/api';

function getStatusChipColor(status) {
  if (status === 'authenticated' || status === 'ready' || status === 'ok') return 'success';
  if (status === 'degraded' || status === 'empty') return 'warning';
  if (status === 'error' || status === 'unreachable') return 'error';
  return 'default';
}

function getHealthSummary(healthState) {
  if (healthState.loading) {
    return { label: 'API: checking', color: 'default' };
  }

  if (healthState.error) {
    return { label: 'API: unreachable', color: 'error' };
  }

  if (healthState.data?.status === 'ok') {
    return { label: 'API: ok', color: 'success' };
  }

  if (healthState.data?.status) {
    return { label: `API: ${healthState.data.status}`, color: 'warning' };
  }

  return { label: 'API: unknown', color: 'default' };
}

export default function SystemDiagnosticsPanel({
  title = 'Diagnostics',
  subtitle = null,
  authStatus = 'unknown',
  planState,
  todayState,
  analyticsState,
  latestIssue = null,
  failureCount = 0,
  actions = null,
  dataTestId,
  showHealthDetails = false,
}) {
  const [healthState, setHealthState] = useState({
    loading: true,
    data: null,
    error: null,
    checkedAt: null,
  });

  const runHealthCheck = useCallback(async () => {
    setHealthState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const response = await systemAPI.getHealthStatus();
      setHealthState({
        loading: false,
        data: response?.data ?? null,
        error: null,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      const requestIdLabel = formatRequestIdLabel(error?.requestId);
      const message = requestIdLabel
        ? `${error.message || 'Failed to reach the API health endpoint.'} ${requestIdLabel}`
        : (error.message || 'Failed to reach the API health endpoint.');

      setHealthState({
        loading: false,
        data: null,
        error: message,
        checkedAt: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  const diagnosticsApiBase = getApiBaseUrl() || 'same-origin';
  const diagnosticsBuild = process.env.REACT_APP_BUILD_SHA || process.env.NODE_ENV || 'development';
  const healthSummary = getHealthSummary(healthState);
  const visibleIssue = Array.from(new Set([latestIssue, healthState.error].filter(Boolean))).join(' | ') || null;
  const lastChecked = useMemo(() => {
    if (!healthState.checkedAt) return 'pending';
    return new Date(healthState.checkedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [healthState.checkedAt]);

  return (
    <Paper
      data-testid={dataTestId}
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.25}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: subtitle || visibleIssue || actions || showHealthDetails ? 1.5 : 0 }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {actions}
          <Button size="small" variant="outlined" onClick={runHealthCheck}>
            Retry API Check
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }} sx={{ flexWrap: 'wrap' }}>
        <Chip size="small" label={`Build: ${diagnosticsBuild}`} />
        <Chip size="small" label={`API Base: ${diagnosticsApiBase}`} />
        <Chip size="small" color={healthSummary.color} label={healthSummary.label} />
        <Chip size="small" color={getStatusChipColor(authStatus)} label={`Auth: ${authStatus}`} />
        {planState && <Chip size="small" color={getStatusChipColor(planState)} label={`Plan: ${planState}`} />}
        {todayState && <Chip size="small" color={getStatusChipColor(todayState)} label={`Today: ${todayState}`} />}
        {analyticsState && <Chip size="small" color={getStatusChipColor(analyticsState)} label={`Analytics: ${analyticsState}`} />}
        <Chip size="small" color={failureCount > 0 ? 'warning' : 'success'} label={`Failures: ${failureCount}`} />
        <Chip size="small" label={`Checked: ${lastChecked}`} />
      </Stack>

      {visibleIssue && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Latest issue: {visibleIssue}
        </Typography>
      )}

      {showHealthDetails && (
        <Stack spacing={1.25} sx={{ mt: 1.5 }}>
          {healthState.data?.checks && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                API Checks
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.75 }}>
                {Object.entries(healthState.data.checks).map(([key, value]) => (
                  <Chip key={key} size="small" label={`${key}: ${value}`} />
                ))}
              </Stack>
            </Box>
          )}

          {healthState.data?.service && (
            <Alert severity={healthState.data.status === 'ok' ? 'success' : 'warning'} sx={{ borderRadius: 2 }}>
              {healthState.data.service} is reporting {healthState.data.status || 'unknown'} status
              {typeof healthState.data.uptime_s === 'number' ? ` after ${healthState.data.uptime_s}s uptime.` : '.'}
            </Alert>
          )}
        </Stack>
      )}
    </Paper>
  );
}
