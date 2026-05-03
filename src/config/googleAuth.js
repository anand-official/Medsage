const RUNTIME_GOOGLE_CLIENT_ID_KEY = '__MEDSAGE_GOOGLE_CLIENT_ID__';

export function getGoogleClientId() {
  if (typeof window !== 'undefined') {
    const runtimeClientId = window[RUNTIME_GOOGLE_CLIENT_ID_KEY];
    if (typeof runtimeClientId === 'string' && runtimeClientId.trim()) {
      return runtimeClientId.trim();
    }
  }

  return '';
}

export function setRuntimeGoogleClientId(clientId) {
  if (typeof window === 'undefined') return;
  window[RUNTIME_GOOGLE_CLIENT_ID_KEY] = String(clientId || '').trim();
}
