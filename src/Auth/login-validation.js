import { validateLoginFields } from "./registration-validation.js";
import { saveAuthSession } from "./auth-session.js";
import { switchModal } from "../interactivity/modal-navigation.js";

const LOGIN_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/login";

export function validateLogin(credentials) {
  const errors = validateLoginFields(credentials);
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function initializeLoginForm(form, doc = document) {
  if (form.dataset.loginInitialized === "true") return;
  form.dataset.loginInitialized = "true";

  const feedback = new Map(); //map function to store feedback elements for each field
  for (const fieldName of ["email", "password"]) {
    const field = form.elements.namedItem(fieldName);
    const wrapper = doc.createElement("div");
    wrapper.className = "login-input-wrapper";
    field.before(wrapper);
    wrapper.append(field);

    const icon = doc.createElement("img");
    icon.className = "login-validation-icon";
    icon.alt = "";
    icon.hidden = true;
    icon.setAttribute("aria-hidden", "true");
    wrapper.append(icon);

    const message = doc.createElement("p");
    message.className = "login-validation-message";
    message.id = `login-${fieldName}-message`;
    message.hidden = true;
    wrapper.after(message);
    field.setAttribute("aria-describedby", message.id);
    feedback.set(fieldName, { field, icon, message });
  }

  function readCredentials() {
    return {
      email: form.elements.namedItem("email").value.trim(),
      password: form.elements.namedItem("password").value,
    };
  }

  // Avoid showing validation feedback on untouched fields while keeping related errors current.
  const touchedFields = new Set();
  function updateField(fieldName, errors = validateLogin(readCredentials()).errors) {
    const item = feedback.get(fieldName);
    if (!item) return;

    const { field, icon, message } = item;
    const error = errors[fieldName];
    const hasValue = field.value.length > 0;
    field.classList.remove("registration-valid", "registration-invalid");
    field.closest(".login-field")?.classList.toggle("is-invalid", Boolean(error));
    field.setAttribute("aria-invalid", error ? "true" : "false");
    icon.hidden = true;
    message.hidden = true;
    message.textContent = "";

    if (error) {
      field.classList.add("registration-invalid");
      icon.src = "/styles/SVG/exclamation-warning-invalid.svg";
      icon.hidden = false;
      message.textContent = error;
      message.hidden = false;
    } else if (hasValue) {
      field.classList.add("registration-valid");
      icon.src = "/styles/SVG/checkmark-valid.svg";
      icon.hidden = false;
    } else {
      field.removeAttribute("aria-invalid");
    }
  }

  function updateCredentialFeedback(fieldName) {
    touchedFields.add(fieldName);
    for (const touchedField of touchedFields) updateField(touchedField);
  }

  for (const { field } of feedback.values()) {
    field.addEventListener("input", () => updateCredentialFeedback(field.name));
    field.addEventListener("change", () => updateCredentialFeedback(field.name));
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const credentials = readCredentials();
    const validation = validateLogin(credentials);
    for (const fieldName of feedback.keys()) {
      touchedFields.add(fieldName);
      updateField(fieldName, validation.errors);
    }
    if (!validation.isValid) return;

    const status = form.querySelector("[role='status']");
    if (status) {
      status.hidden = true;
      status.textContent = "";
    }

    try {
      const response = await doc.defaultView.fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (response.status === 401 || response.status === 422) {
        const payload = await response.json();
        const apiMessage =
          typeof payload?.message === "string"
            ? payload.message
            : "Invalid credentials.";
        for (const fieldName of feedback.keys()) {
          const item = feedback.get(fieldName);
          item.field.classList.remove("registration-valid");
          item.field.classList.add("registration-invalid");
          item.field.closest(".login-field")?.classList.add("is-invalid");
          item.field.setAttribute("aria-invalid", "true");
          item.icon.src = "/styles/SVG/exclamation-warning-invalid.svg";
          item.icon.hidden = false;
          item.message.textContent =
            payload?.errors?.[fieldName]?.[0] || "Invalid credentials.";
          item.message.hidden = false;
        }
        if (status) {
          status.hidden = false;
          status.textContent = apiMessage;
        }
        return;
      }
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const payload = await response.json();
      const session = payload?.data;
      if (
        !session?.user ||
        typeof session.token !== "string" ||
        !session.token
      ) {
        throw new TypeError("Login response did not contain a valid session");
      }
      saveAuthSession(session, doc.defaultView.sessionStorage);

      // The protected-action handler listens for this event to resume the interrupted action.
      doc.dispatchEvent(
        new doc.defaultView.CustomEvent("auth:login", {
          detail: { email: credentials.email, user: session.user },
        }),
      );
      const loginModal = form.closest("#loginModal");
      if (loginModal && doc.defaultView.bootstrap?.Modal) {
        doc.defaultView.bootstrap.Modal.getOrCreateInstance(loginModal).hide();
      }
    } catch (error) {
      if (status) {
        status.hidden = false;
        status.textContent = "Unable to log in. Please try again.";
      }
      console.error(error);
    }
  });

  const signupLink = form.querySelector(".login-signup-link");
  if (signupLink) { 
    signupLink.addEventListener("click", (event) => {
      event.preventDefault();
      const loginModal = form.closest("#loginModal");
      const signupButton = doc.querySelector(".sign-up-button");
      if (!loginModal || !signupButton) {
        throw new Error("Unable to open the sign-up modal");
      }

      switchModal(doc, loginModal, signupButton);
    });
  }
}
