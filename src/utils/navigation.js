import { useCallback } from 'react';

function canUseHistory() {
  return typeof window !== 'undefined' && Boolean(window.history);
}

export function navigateTo(path, options = {}) {
  if (!path || !canUseHistory()) return;

  const nextState = {
    usr: options.state || null,
    key: `${Date.now()}`,
  };

  if (options.replace) {
    window.history.replaceState(nextState, '', path);
  } else {
    window.history.pushState(nextState, '', path);
  }

  window.dispatchEvent(new PopStateEvent('popstate', { state: nextState }));
}

export function getHistoryRedirectState() {
  if (!canUseHistory()) return null;
  return window.history.state?.usr?.from || window.history.state?.from || null;
}

export function useNavigate() {
  return useCallback((path, options = {}) => navigateTo(path, options), []);
}
