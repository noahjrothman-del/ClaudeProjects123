const STORAGE_KEY = 'ricochet-room';

export function saveSession(code, name) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code, name }));
}

export function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function hasStoredSession() {
  return Boolean(loadSession());
}
