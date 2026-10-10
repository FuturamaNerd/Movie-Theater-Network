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
  const email = registration.email?.trim() ?? "";
  const existingUsernames = availableAccounts.existingUsernames ?? [];
  const existingEmails = availableAccounts.existingEmails ?? [];

  if (
    username.length < 3 ||
    existingUsernames.some(
      (existing) => existing.toLowerCase() === username.toLowerCase(),
    )
  ) {
    errors.username = true;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    existingEmails.some(
      (existing) => existing.toLowerCase() === email.toLowerCase(),
    )
  ) {
    errors.email = true;
  }

  if (
    typeof registration.password !== "string" ||
    registration.password.length < 3
  ) {
    errors.password = true;
  }
  if (registration.confirmPassword !== registration.password) {
    errors.confirmPassword = true;
  }
  if (registration.avatar && !AVATAR_TYPES.includes(registration.avatar.type)) {
    errors.avatar = true;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function initializeRegistrationForm(form) {
  if (form.dataset.registrationInitialized === "true") return;
  form.dataset.registrationInitialized = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const avatar = form.elements.avatar.files[0];
    const values = {
      username: form.elements.username.value,
      email: form.elements.email.value,
      password: form.elements.password.value,
      confirmPassword: form.elements.confirmPassword.value,
    };
    const registration = { ...values, ...(avatar ? { avatar } : {}) };
    const validation = validateRegistration(registration);

    if (!validation.isValid) return;

    const options = avatar
      ? { method: "POST", body: new FormData(form) }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        };

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
