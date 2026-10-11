import { initializeRegistrationForm } from "../Auth/registration-validation.js";
import { switchModal } from "./modal-navigation.js";

export function initializeSignupModal(doc = document) {
  const signupButton = doc.querySelector(".sign-up-button");
  if (!signupButton) return;

  signupButton.addEventListener("click", async () => {
    let signupModal = doc.querySelector("#signupModal");

    if (!signupModal) {
      const response = await doc.defaultView.fetch(
        "/supplementary-content/sign-up-modal.html",
      );
      if (!response.ok) {
        throw new Error(`Failed to load sign-up modal: ${response.status}`);
      }

      const modalDocument = new doc.defaultView.DOMParser().parseFromString(
        await response.text(),
        "text/html",
      );
      signupModal = modalDocument.querySelector("#signupModal");
      if (!signupModal) {
        throw new Error("Sign-up modal markup was not found in the response");
      }
      doc.body.append(signupModal);
    }

    initializeRegistrationForm(signupModal.querySelector("form"), doc);
    const loginLink = signupModal.querySelector(".signup-login-prompt a");
    if (loginLink && loginLink.dataset.modalNavigationInitialized !== "true") {
      loginLink.dataset.modalNavigationInitialized = "true";
      loginLink.addEventListener("click", (event) => {
        event.preventDefault();
        const loginButton = doc.querySelector(".login-button");
        if (!loginButton) {
          throw new Error("Unable to open the login modal");
        }
        switchModal(doc, signupModal, loginButton);
      });
    }
    doc.defaultView.bootstrap.Modal.getOrCreateInstance(signupModal).show();
  });
}

if (typeof document !== "undefined") {
  if (document.querySelector(".sign-up-button")) {
    initializeSignupModal();
  } else {
    document.addEventListener(
      "header:rendered",
      () => initializeSignupModal(),
      { once: true },
    );
  }
}
