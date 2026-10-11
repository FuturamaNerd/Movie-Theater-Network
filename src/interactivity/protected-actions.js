import { getAuthSession } from "../Auth/auth-session.js";

export function initializeProtectedActions(doc = document) {
  if (doc.documentElement.dataset.protectedActionsInitialized === "true") {
    return;
  }
  doc.documentElement.dataset.protectedActionsInitialized = "true";

  let pendingAction;
  doc.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof doc.defaultView.Element)) return;

      const protectedTarget = target.closest("[data-requires-auth]");
      if (!protectedTarget || getAuthSession(doc.defaultView.sessionStorage)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      pendingAction = () => {
        if (protectedTarget.isConnected) protectedTarget.click();
      };

      const loginButton = doc.querySelector(".login-button");
      if (!loginButton) {
        pendingAction = undefined;
        throw new Error("Unable to open the login modal");
      }
      loginButton.click();
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
