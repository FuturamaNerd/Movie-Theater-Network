const AUTH_SESSION_KEY = "auth-session";

/**
 * @param {import("../models/registration-profile-interfaces").AuthSession} session
 * @param {Storage} [storage]
 */
export function saveAuthSession(session, storage = window.sessionStorage) {
  if (!session?.user || typeof session.token !== "string" || !session.token) {
    throw new TypeError("A user and authentication token are required");
  }

  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

/**
 * @param {Storage} [storage]
 * @returns {import("../models/registration-profile-interfaces").AuthSession | null}
 */
export function getAuthSession(storage = window.sessionStorage) {
  const serializedSession = storage.getItem(AUTH_SESSION_KEY);
  if (serializedSession === null) return null;

  const session = JSON.parse(serializedSession);
  if (
    !session?.user ||
    typeof session.token !== "string" ||
    !session.token
  ) {
    throw new TypeError("The stored authentication session is invalid");
  }

  return session;
}

/**
 * @param {Storage} [storage]
 */
export function clearAuthSession(storage = window.sessionStorage) {
  storage.removeItem(AUTH_SESSION_KEY);
}
