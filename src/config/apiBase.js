const LOCAL_API_URL = 'http://localhost:3001';
const FALLBACK_PRODUCTION_API_URL = 'https://medsage-1.onrender.com';
const LEGACY_DIRECT_BACKEND_URLS = new Set([FALLBACK_PRODUCTION_API_URL]);

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.REACT_APP_API_URL?.trim();
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (configuredUrl) {
      const normalizedConfiguredUrl = trimTrailingSlash(configuredUrl);
      if (isLocalHost || !LEGACY_DIRECT_BACKEND_URLS.has(normalizedConfiguredUrl)) {
        return normalizedConfiguredUrl;
      }
    }

    if (isLocalHost) {
      return LOCAL_API_URL;
    }

    // In deployed frontend environments, prefer same-origin API calls so the
    // hosting platform can proxy /api/* to the backend without browser CORS.
    return '';
  }

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return FALLBACK_PRODUCTION_API_URL;
}
