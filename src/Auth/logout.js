import {
  clearAuthSession,
  getAuthSession,
} from "./auth-session.js";

const LOGOUT_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/logout";

function waitForLogin(doc) {
  return new Promise((resolve, reject) => {
    const loginButton = doc.querySelector(".login-button");
    if (!loginButton) {
      reject(new Error("Unable to open the login modal"));
      return;
    }

    doc.addEventListener("auth:login", resolve, { once: true });
    loginButton.click();
  });
}

function requestLogout(doc, token) {
  return doc.defaultView.fetch(LOGOUT_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function logout(doc = document) {
  const storage = doc.defaultView.sessionStorage;
  const session = getAuthSession(storage);
  if (!session) {
    throw new Error("Cannot log out without an authenticated session");
  }

  let response = await requestLogout(doc, session.token);
  if (response.status === 401) {
    clearAuthSession(storage);
    await waitForLogin(doc);

    const renewedSession = getAuthSession(storage);
    if (!renewedSession) {
      throw new Error("Login completed without an authenticated session");
    }

    response = await requestLogout(doc, renewedSession.token);
  }

  if (response.status === 401) {
    clearAuthSession(storage);
    throw new Error("Logout failed: 401");
  }
  if (response.status !== 204) {
    throw new Error(`Logout failed: ${response.status}`);
  }

  clearAuthSession(storage);
}
