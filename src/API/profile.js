import {
  getAuthSession,
  handleUnauthorizedResponse,
  saveAuthSession,
} from "../Auth/auth-session.js";

const PROFILE_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/profile";
const FILTER_OPTIONS_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/filter-options";
const PROFILE_FIELDS = ["fullName", "mobileNumber", "dateOfBirth"];

function ensureFieldMessage(field, doc) {
  let message = field.form.querySelector(
    `[data-error-for="${field.name}"]`,
  );
  if (!message) {
    message = doc.createElement("p");
    message.className = "profile-field-error";
    message.dataset.errorFor = field.name;
    message.setAttribute("role", "alert");
    field.after(message);
  }
  return message;
}

function showProfileErrors(form, errors, doc) {
  for (const fieldName of PROFILE_FIELDS) {
    const field = form.elements.namedItem(fieldName);
    const message = form.querySelector(`[data-error-for="${fieldName}"]`);
    field?.removeAttribute("aria-invalid");
    if (message) message.textContent = "";
  }

  for (const [fieldName, rawMessages] of Object.entries(errors || {})) {
    const field = form.elements.namedItem(fieldName);
    if (!field) continue;

    const messages = Array.isArray(rawMessages) ? rawMessages : [rawMessages];
    // Keep API wording intact so field-specific validation matches the contract.
    const copy = messages.filter((message) => typeof message === "string");
    if (copy.length === 0) continue;

    field.setAttribute("aria-invalid", "true");
    ensureFieldMessage(field, doc).textContent = copy.join(" ");
  }
}

function renderProfileState(form, user, doc) {
  const banner = doc.querySelector("#profile-incomplete-banner");
  if (banner) banner.hidden = user.profileComplete === true;

  const eligibility = doc.querySelector("#profile-eligibility");
  if (eligibility) {
    eligibility.hidden = typeof user.age !== "number";
    // Age is supplied by the API; use it directly rather than recalculating it here.
    eligibility.textContent =
      typeof user.age !== "number"
        ? ""
        : user.age >= 18
          ? `You are ${user.age}, you can buy tickets for all age ratings`
          : `You are ${user.age}, age restrictions apply to ticket purchases.`;
  }

  const profileLink = user.preferredVenue?.id;
  const venueField = form.elements.namedItem("preferredVenueId");
  if (venueField && profileLink != null) venueField.value = String(profileLink);

  const avatarField = form.elements.namedItem("avatar");
  if (avatarField && user.avatar) avatarField.dataset.currentAvatar = user.avatar;
}

function populateProfileForm(form, user) {
  for (const fieldName of PROFILE_FIELDS) {
    const field = form.elements.namedItem(fieldName);
    if (field) field.value = user[fieldName] ?? "";
  }

  const emailField = form.elements.namedItem("email");
  if (emailField) {
    emailField.value = user.email ?? "";
    emailField.readOnly = true;
  }

  renderProfileState(form, user, form.ownerDocument);
}

function clearProfileForm(form, doc) {
  // Clear cached personal data as soon as auth is lost so it cannot remain visible.
  for (const fieldName of [...PROFILE_FIELDS, "email", "preferredVenueId"]) {
    const field = form.elements.namedItem(fieldName);
    if (field) field.value = "";
    field?.removeAttribute("aria-invalid");

    const message = form.querySelector(`[data-error-for="${fieldName}"]`);
    if (message) message.textContent = "";
  }

  const avatarField = form.elements.namedItem("avatar");
  if (avatarField) delete avatarField.dataset.currentAvatar;

  const status = form.querySelector("[role='status']");
  if (status) {
    status.hidden = false;
    status.textContent = "Log in to view and update your profile.";
  }

  const banner = doc.querySelector("#profile-incomplete-banner");
  if (banner) banner.hidden = true;
  const eligibility = doc.querySelector("#profile-eligibility");
  if (eligibility) {
    eligibility.hidden = true;
    eligibility.textContent = "";
  }
}

async function loadVenueOptions(form, user, doc, status) {
  const venueField = form.elements.namedItem("preferredVenueId");
  if (!venueField) return;

  try {
    const response = await doc.defaultView.fetch(FILTER_OPTIONS_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to load profile venues: ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload?.data?.venues)) {
      throw new TypeError("Filter options response did not contain venues");
    }

    // Filter options are shared with sessions; their venue IDs populate this profile field.
    const placeholder = venueField.options[0];
    venueField.replaceChildren(placeholder);
    for (const venue of payload.data.venues) {
      const option = doc.createElement("option");
      option.value = String(venue.id);
      option.textContent = `${venue.name} — ${venue.city}`;
      venueField.append(option);
    }

    if (user.preferredVenue?.id != null) {
      venueField.value = String(user.preferredVenue.id);
    }
  } catch (error) {
    if (status) {
      status.hidden = false;
      status.textContent = "Unable to load venues. Please try again.";
    }
    console.error(error);
  }
}

export function initializeProfileForm(form, doc = document) {
  if (form.dataset.profileInitialized === "true") return;
  form.dataset.profileInitialized = "true";

  const status = form.querySelector("[role='status']");
  doc.addEventListener("auth:logout", () => clearProfileForm(form, doc));
  doc.addEventListener("auth:unauthorized", () => clearProfileForm(form, doc));
  const session = getAuthSession(doc.defaultView.sessionStorage);
  if (!session) {
    if (status) {
      status.hidden = false;
      status.textContent = "Log in to view and update your profile.";
    }
    return;
  }

  populateProfileForm(form, session.user);
  loadVenueOptions(form, session.user, doc, status);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (status) {
      status.hidden = true;
      status.textContent = "";
    }

    const payload = new FormData();
    payload.append("fullName", form.elements.namedItem("fullName").value);
    // The API validates and stores mobile numbers as digits without embedded spaces.
    payload.append(
      "mobileNumber",
      form.elements.namedItem("mobileNumber").value.replace(/\s/g, ""),
    );
    payload.append(
      "dateOfBirth",
      form.elements.namedItem("dateOfBirth").value,
    );

    // Email is display-only and intentionally omitted from the profile update request.
    const venueId = form.elements.namedItem("preferredVenueId")?.value;
    if (venueId) payload.append("preferredVenueId", venueId);
    const avatar = form.elements.namedItem("avatar")?.files?.[0];
    if (avatar) payload.append("avatar", avatar);

    try {
      const response = await doc.defaultView.fetch(PROFILE_ENDPOINT, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: payload,
      });

      if (response.status === 401) {
        handleUnauthorizedResponse(response, doc);
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        showProfileErrors(form, result.errors, doc);
        if (status) {
          status.hidden = false;
          status.textContent = result.message || `Profile update failed (${response.status}).`;
        }
        return;
      }

      const user = result?.data;
      if (!user || typeof user.profileComplete !== "boolean") {
        throw new TypeError("Profile response did not contain a valid user");
      }

      // Replace the cached user with the canonical profile returned by the API.
      saveAuthSession({ ...session, user }, doc.defaultView.sessionStorage);
      populateProfileForm(form, user);
      showProfileErrors(form, {}, doc);
      if (status) {
        status.hidden = false;
        status.textContent = "Profile saved.";
      }
      doc.dispatchEvent(
        new doc.defaultView.CustomEvent("auth:profile-updated", {
          detail: { user },
        }),
      );
    } catch (error) {
      if (status) {
        status.hidden = false;
        status.textContent = "Unable to save your profile. Please try again.";
      }
      console.error(error);
    }
  });
}

if (typeof document !== "undefined") {
  const form = document.querySelector("#profile-form");
  if (form) initializeProfileForm(form, document);
}