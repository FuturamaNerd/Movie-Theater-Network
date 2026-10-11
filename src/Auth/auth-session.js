const AUTH_SESSION_KEY = "auth-session";
const CURRENT_USER_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/me";
// Shared across startup modules so the navbar and protected actions make one request.
const restorationByDocument = new WeakMap();

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
  if (typeof window !== "undefined" && storage === window.sessionStorage) {
    restorationByDocument.delete(window.document);
  }
}

export function restoreAuthSession(doc = document) {
  const storage = doc.defaultView.sessionStorage;
  const session = getAuthSession(storage);
  const existingRestoration = restorationByDocument.get(doc);
  if (existingRestoration?.token === (session?.token ?? null)) {
    return existingRestoration.promise;
  }

  // A guest needs no API call; cache this state to avoid duplicate startup checks.
  if (!session) {
    const promise = Promise.resolve(null);
    restorationByDocument.set(doc, { token: null, promise });
    return promise;
  }

  const restoration = { token: session.token, promise: null };
  const promise = doc.defaultView
    .fetch(CURRENT_USER_ENDPOINT, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
    })
    .then(async (response) => {
      if (response.status === 401) {
        // An expired token restores the page as a guest; it should not open login by itself.
        clearAuthSession(storage);
        doc.dispatchEvent(new doc.defaultView.CustomEvent("auth:logout"));
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to restore authentication: ${response.status}`);
      }

      const payload = await response.json();
      if (!payload?.data || typeof payload.data !== "object") {
        throw new TypeError("Current-user response did not contain user data");
      }

      const restoredSession = { ...session, user: payload.data };
      saveAuthSession(restoredSession, storage);
      // Consumers can refresh their UI after the server's current user is stored.
      doc.dispatchEvent(
        new doc.defaultView.CustomEvent("auth:session-restored", {
          detail: { user: payload.data },
        }),
      );
      return restoredSession;
    })
    .catch((error) => {
      if (restorationByDocument.get(doc) === restoration) {
        restorationByDocument.delete(doc);
      }
      throw error;
    });
  restoration.promise = promise;
  restorationByDocument.set(doc, restoration);
  return promise;
}

export function handleUnauthorizedResponse(response, doc = document) {
  if (response.status !== 401) return response;

  clearAuthSession(doc.defaultView.sessionStorage);
  doc.dispatchEvent(new doc.defaultView.CustomEvent("auth:logout"));
  doc.dispatchEvent(new doc.defaultView.CustomEvent("auth:unauthorized"));
  return response;
}
