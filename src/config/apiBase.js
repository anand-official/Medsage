const LOCAL_API_URL = 'http://localhost:3001';
const PRODUCTION_API_URL = 'https://medsage-1.onrender.com';

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.REACT_APP_API_URL?.trim();
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocalHost) {
      return LOCAL_API_URL;
    }
  }

  return PRODUCTION_API_URL;
}

