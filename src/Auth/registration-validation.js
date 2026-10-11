const REGISTRATION_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/register";
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * @typedef {import("../models/registration-profile-interfaces").RegistrationRequest & {
 *   avatar?: File
 * }} RegistrationFormData
 */

/**
 * @param {RegistrationFormData} registration
 * @param {{existingUsernames?: string[], existingEmails?: string[]}} [availableAccounts]
 */
export function validateRegistration(registration, availableAccounts = {}) {
  const errors = {};
  const username = registration.username?.trim() ?? "";
  const existingUsernames = availableAccounts.existingUsernames ?? [];
  const existingEmails = availableAccounts.existingEmails ?? [];

  Object.assign(
    errors,
    validateLoginFields({
      email: registration.email,
      password: registration.password,
    }),
  );

  if (username.length < 3) {
    errors.username = "the username field must be at least 3 characters.";
  } else if (
    existingUsernames.some(
      (existing) => existing.toLowerCase() === username.toLowerCase(),
    )
  ) {
    errors.username = "The username is already taken.";
  }

  const email = registration.email?.trim() ?? "";
  if (
    !errors.email &&
    existingEmails.some(
      (existing) => existing.toLowerCase() === email.toLowerCase(),
    )
  ) {
    errors.email = "This email address is already registered.";
  }

  if (registration.confirmPassword !== registration.password) {
    errors.confirmPassword = "The password field confirmation does not match.";
  }
  if (registration.avatar && !AVATAR_TYPES.includes(registration.avatar.type)) {
    errors.avatar = "Avatar must be a JPG, PNG, or WebP image.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateLoginFields(credentials) {
  const errors = {};
  const email = credentials.email?.trim() ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "The email field must be a valid email address.";
  }
  if (
    typeof credentials.password !== "string" ||
    credentials.password.length < 3
  ) {
    errors.password = "The password field must be at least 3 characters.";
  }

  return errors;
}

export function initializeRegistrationForm(form) {
  if (form.dataset.registrationInitialized === "true") return;
  form.dataset.registrationInitialized = "true";

  const fields = ["username", "email", "password", "confirmPassword", "avatar"]
    .map((name) => form.elements.namedItem(name))
    .filter(Boolean);
  const feedback = new Map();

  for (const field of fields) {
    const wrapper = document.createElement("div");
    wrapper.className = "signup-input-wrapper";
    field.before(wrapper);
    wrapper.append(field);

    const icon = document.createElement("img");
    icon.className = "registration-validation-icon";
    icon.alt = "";
    icon.hidden = true;
    icon.setAttribute("aria-hidden", "true");
    wrapper.append(icon);

    const message = document.createElement("p");
    message.className = "registration-validation-message";
    message.id = `${field.name}-validation-message`;
    message.hidden = true;
    wrapper.after(message);
    field.setAttribute("aria-describedby", message.id);

    feedback.set(field.name, { field, icon, message });
  }

  function readRegistration() {
    const avatar = form.elements.namedItem("avatar")?.files?.[0];
    return {
      username: form.elements.namedItem("username")?.value ?? "",
      email: form.elements.namedItem("email")?.value ?? "",
      password: form.elements.namedItem("password")?.value ?? "",
      confirmPassword:
        form.elements.namedItem("confirmPassword")?.value ?? "",
      ...(avatar ? { avatar } : {}),
    };
  }

  function updateField(fieldName, validation = validateRegistration(readRegistration())) {
    const item = feedback.get(fieldName);
    if (!item) return;

    const { field, icon, message } = item;
    const error = validation.errors[fieldName];
    const hasValue =
      field.type === "file" ? Boolean(field.files?.length) : field.value.length > 0;

    field.classList.remove("registration-valid", "registration-invalid");
    icon.hidden = true;
    message.hidden = true;
    message.textContent = "";

    if (!hasValue && field.type === "file") {
      field.removeAttribute("aria-invalid");
      return;
    }

    if (error) {
      field.classList.add("registration-invalid");
      field.setAttribute("aria-invalid", "true");
      icon.src = "/styles/SVG/exclamation-warning-invalid.svg";
      icon.hidden = false;
      message.textContent = error;
      message.hidden = false;
    } else if (hasValue) {
      field.classList.add("registration-valid");
      field.setAttribute("aria-invalid", "false");
      icon.src = "/styles/SVG/checkmark-valid.svg";
      icon.hidden = false;
    } else {
      field.removeAttribute("aria-invalid");
    }
  }

  for (const { field } of feedback.values()) {
    const updateCurrentField = () => {
      updateField(field.name);
      if (field.name === "password") updateField("confirmPassword");
    };
    field.addEventListener("input", updateCurrentField);
    field.addEventListener("change", updateCurrentField);
  }

  form.addEventListener(
    "invalid",
    (event) => updateField(event.target.name),
    true,
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const registration = readRegistration();
    const validation = validateRegistration(registration);
    for (const fieldName of feedback.keys()) {
      updateField(fieldName, validation);
    }

    if (!validation.isValid) return;

    const payload = new FormData();
    payload.append("username", registration.username);
    payload.append("email", registration.email);
    payload.append("password", registration.password);
    payload.append("password_confirmation", registration.confirmPassword);
    if (registration.avatar) payload.append("avatar", registration.avatar);
    const options = { method: "POST", body: payload };

    const status = form.querySelector("[role='status']");
    try {
      const response = await fetch(REGISTRATION_ENDPOINT, options);
      if (!response.ok) {
        throw new Error(`Registration failed: ${response.status}`);
      }
      if (status) status.textContent = "Registration successful.";
    } catch (error) {
      if (status) status.textContent = "Registration failed. Please try again.";
      console.error(error);
    }
  });
}
