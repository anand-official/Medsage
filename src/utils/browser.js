const DEFAULT_VIEWPORT_WIDTH = 1024;

export function canUseDOM() {
  return typeof window !== 'undefined';
}

function getStorage(type) {
  if (!canUseDOM() || !window?.[type]) return null;

  try {
    return window[type];
  } catch {
    return null;
  }
}

function getLocalStorage() {
  return getStorage('localStorage');
}

function getSessionStorage() {
  return getStorage('sessionStorage');
}

export function getStoredValue(key, fallback = null) {
  const storage = getLocalStorage();
  if (!storage) return fallback;

  try {
    const value = storage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function setStoredValue(key, value) {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStoredValue(key) {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getSessionStoredValue(key, fallback = null) {
  const storage = getSessionStorage();
  if (!storage) return fallback;

  try {
    const value = storage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function setSessionStoredValue(key, value) {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeSessionStoredValue(key) {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeJsonParse(raw, fallback) {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function getViewportWidth(fallback = DEFAULT_VIEWPORT_WIDTH) {
  return canUseDOM() ? window.innerWidth : fallback;
}

export function getMediaQueryList(query) {
  if (!canUseDOM() || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(query);
}

export function matchesMediaQuery(query, fallback = false) {
  return getMediaQueryList(query)?.matches ?? fallback;
}

export function subscribeToMediaQuery(query, handler) {
  const mediaQueryList = getMediaQueryList(query);
  if (!mediaQueryList) return () => {};

  const wrappedHandler = (event) => handler(event.matches, event);

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', wrappedHandler);
    return () => mediaQueryList.removeEventListener('change', wrappedHandler);
  }

  if (typeof mediaQueryList.addListener === 'function') {
    mediaQueryList.addListener(wrappedHandler);
    return () => mediaQueryList.removeListener(wrappedHandler);
  }

  return () => {};
}

export function getSpeechSynthesis() {
  if (!canUseDOM() || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

export function getSpeechRecognitionConstructor() {
  if (!canUseDOM()) return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function getSpeechSynthesisUtteranceConstructor() {
  if (!canUseDOM()) return null;
  return window.SpeechSynthesisUtterance || globalThis.SpeechSynthesisUtterance || null;
}

export function reloadWindow() {
  if (canUseDOM() && window.location && typeof window.location.reload === 'function') {
    window.location.reload();
  }
}
