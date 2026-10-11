import { initializeLoginForm } from "../Auth/login-validation.js";

export function initializeLoginModal(doc = document) {
  const loginButton = doc.querySelector(".login-button");
  if (!loginButton) return;

  loginButton.addEventListener("click", async () => {
    let loginModal = doc.querySelector("#loginModal");

    if (!loginModal) {
      const response = await doc.defaultView.fetch(
        "/supplementary-content/login-modal.html",
      );
      if (!response.ok) {
        throw new Error(`Failed to load login modal: ${response.status}`);
      }

      const modalDocument = new doc.defaultView.DOMParser().parseFromString(
        await response.text(),
        "text/html",
      );
      loginModal = modalDocument.querySelector("#loginModal");
      if (!loginModal) {
        throw new Error("Login modal markup was not found in the response");
      }
      doc.body.append(loginModal);
    }

    initializeLoginForm(loginModal.querySelector("form"), doc);
    doc.defaultView.bootstrap.Modal.getOrCreateInstance(loginModal).show();
  });
}

if (typeof document !== "undefined") { // Check if running in a browser environment
  if (document.querySelector(".login-button")) {
  } else {
    document.addEventListener(
      "header:rendered",
      () => initializeLoginModal(),
      { once: true },
    );
  }
}
