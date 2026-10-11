import {
  getAuthSession,
  restoreAuthSession,
} from "../Auth/auth-session.js";

export function initializeProtectedActions(doc = document) {
  if (doc.documentElement.dataset.protectedActionsInitialized === "true") {
    return;
  }
  doc.documentElement.dataset.protectedActionsInitialized = "true";

  let pendingAction;
  let restorationComplete = false;
  const restoration = restoreAuthSession(doc)
    .catch((error) => {
      console.error(error);
      return getAuthSession(doc.defaultView.sessionStorage);
    })
    .then((session) => {
      restorationComplete = true;
      return session;
    });

  function openLogin() {
    const loginButton = doc.querySelector(".login-button");
    if (!loginButton) {
      pendingAction = undefined;
      throw new Error("Unable to open the login modal");
    }
    loginButton.click();
  }

  doc.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof doc.defaultView.Element)) return;

      const protectedTarget = target.closest("[data-requires-auth]");
      if (!protectedTarget) return;
      if (
        restorationComplete &&
        getAuthSession(doc.defaultView.sessionStorage)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      pendingAction = () => {
        if (protectedTarget.isConnected) protectedTarget.click();
      };

      if (!getAuthSession(doc.defaultView.sessionStorage)) {
        openLogin();
        return;
      }

      restoration.then(() => {
        if (getAuthSession(doc.defaultView.sessionStorage)) {
          const resumeAction = pendingAction;
          pendingAction = undefined;
          resumeAction?.();
          return;
        }

        openLogin();
      });
    },
    true,
  );

  doc.addEventListener("auth:login", () => {
    const resumeAction = pendingAction;
    pendingAction = undefined;
    resumeAction?.();
  });
}

if (typeof document !== "undefined") {
  initializeProtectedActions();
}
