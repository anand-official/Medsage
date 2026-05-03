import {
  getSessionStoredValue,
  removeSessionStoredValue,
  setSessionStoredValue,
} from './browser';

const POST_AUTH_REDIRECT_KEY = 'post_auth_redirect';

function isSafeRedirectPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

export function setPostAuthRedirect(path) {
  if (!isSafeRedirectPath(path) || path === '/signin') {
    return false;
  }

  return setSessionStoredValue(POST_AUTH_REDIRECT_KEY, path);
}

export function consumePostAuthRedirect() {
  const path = getSessionStoredValue(POST_AUTH_REDIRECT_KEY);
  removeSessionStoredValue(POST_AUTH_REDIRECT_KEY);
  return isSafeRedirectPath(path) ? path : null;
}

export function clearPostAuthRedirect() {
  removeSessionStoredValue(POST_AUTH_REDIRECT_KEY);
}
