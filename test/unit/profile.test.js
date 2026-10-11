import { getAuthSession, saveAuthSession } from "../../src/Auth/auth-session.js";
import { initializeProfileForm } from "../../src/API/profile.js";
import { initializeUserMenu } from "../../src/interactivity/user-menu.js";

const token = "profile-test-token";
const initialUser = {
  id: 2,
  username: "jane",
  email: "user@example.com",
  avatar: null,
  fullName: null,
  mobileNumber: null,
  dateOfBirth: null,
  age: null,
  preferredVenue: null,
  profileComplete: false,
};

const updatedUser = {
  ...initialUser,
  fullName: "Jane Doe",
  mobileNumber: "599123456",
  dateOfBirth: "2002-06-15",
  age: 24,
  profileComplete: true,
};

function createProfileForm() {
  document.body.innerHTML = `
    <header>
      <div class="header-actions">
        <button class="sign-up-button">Sign Up</button>
        <button class="login-button">Log In</button>
      </div>
    </header>
    <main>
      <p id="profile-incomplete-banner" hidden>Complete your profile to book.</p>
      <p id="profile-eligibility" hidden></p>
      <form id="profile-form">
        <input name="fullName" />
        <input name="email" type="email" readonly />
        <input name="mobileNumber" />
        <input name="dateOfBirth" type="date" />
        <select name="preferredVenueId">
          <option value="">Choose a venue</option>
          <option value="2">Batumi Boulevard</option>
          <option value="1">Galleria Tbilisi</option>
          <option value="3">Rustaveli Palace</option>
          <option value="4">Vake Park</option>
        </select>
        <input name="avatar" type="file" />
        <p role="status" hidden></p>
        <button type="submit">Save</button>
      </form>
    </main>
  `;
  window.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        data: {
          venues: [
            { id: 2, name: "Batumi Boulevard", city: "Batumi" },
            { id: 1, name: "Galleria Tbilisi", city: "Tbilisi" },
            { id: 3, name: "Rustaveli Palace", city: "Tbilisi" },
            { id: 4, name: "Vake Park", city: "Tbilisi" },
          ],
        },
      }),
  });
  saveAuthSession({ user: initialUser, token }, window.sessionStorage);
  const form = document.querySelector("#profile-form");
  initializeUserMenu(document);
  initializeProfileForm(form, document);
  return form;
}

function enterProfile(form, mobileNumber = "599 123 456") {
  form.elements.namedItem("fullName").value = "Jane Doe";
  form.elements.namedItem("email").value = "changed@example.com";
  form.elements.namedItem("mobileNumber").value = mobileNumber;
  form.elements.namedItem("dateOfBirth").value = "2002-06-15";
  form.elements.namedItem("preferredVenueId").value = "1";
}

function successfulResponse(user = updatedUser) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: user }),
  };
}

describe("profile API form", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.fetch;
    jest.restoreAllMocks();
  });

  it.each(["599 123 456", "599123456"])(
    "saves %s as a 9-digit mobile number and ignores email changes",
    async (mobileNumber) => {
      const form = createProfileForm();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      enterProfile(form, mobileNumber);
      window.fetch.mockResolvedValue(successfulResponse());

      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const [url, options] = window.fetch.mock.calls.find(
        ([requestUrl]) => requestUrl.endsWith("/api/profile"),
      );
      expect(url).toBe(
        "https://api.kinoxii.redberryinternship.ge/api/profile",
      );
      expect(options.method).toBe("PUT");
      expect(options.headers).toEqual({
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      });
      expect(options.body.get("fullName")).toBe("Jane Doe");
      expect(options.body.get("mobileNumber")).toBe("599123456");
      expect(options.body.get("dateOfBirth")).toBe("2002-06-15");
      expect(options.body.get("preferredVenueId")).toBe("1");
      expect(options.body.has("email")).toBe(false);
      expect(getAuthSession().user).toEqual(updatedUser);
    },
  );

  it("renders each API validation message verbatim on its field", async () => {
    const form = createProfileForm();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    enterProfile(form, "699 123 456");
    const errors = {
      fullName: ["The full name must be at least 3 characters."],
      mobileNumber: [
        "Georgian mobile numbers must start with 5",
        "The mobile number must be exactly 9 digits.",
      ],
      dateOfBirth: [
        "The date of birth must be at least 12 years ago.",
        "The date of birth must be a valid date.",
      ],
    };
    window.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: "The given data was invalid.", errors }),
    });

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    for (const [fieldName, messages] of Object.entries(errors)) {
      const field = form.elements.namedItem(fieldName);
      expect(field.getAttribute("aria-invalid")).toBe("true");
      expect(
        form.querySelector(`[data-error-for="${fieldName}"]`).textContent,
      ).toBe(messages.join(" "));
    }
    expect(form.querySelector("[role='status']").textContent).toBe(
      "The given data was invalid.",
    );
  });

  it("uses profileComplete and the server-provided age for profile notices", async () => {
    const form = createProfileForm();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    enterProfile(form);
    window.fetch.mockResolvedValue(successfulResponse());

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(document.querySelector("#profile-incomplete-banner").hidden).toBe(
      true,
    );
    expect(document.querySelector("#profile-eligibility").textContent).toBe(
      "You are 24, you can buy tickets for all age ratings",
    );
    expect(form.elements.namedItem("email").value).toBe("user@example.com");
    expect(
      [...form.elements.namedItem("preferredVenueId").options].map((option) => [
        option.value,
        option.textContent,
      ]),
    ).toEqual([
      ["", "Choose a venue"],
      ["2", "Batumi Boulevard — Batumi"],
      ["1", "Galleria Tbilisi — Tbilisi"],
      ["3", "Rustaveli Palace — Tbilisi"],
      ["4", "Vake Park — Tbilisi"],
    ]);
    expect(
      document
        .querySelector(".account-avatar-trigger")
        .classList.contains("has-incomplete-profile"),
    ).toBe(false);
    expect(document.querySelector(".account-profile-notice").hidden).toBe(true);
  });

  it("clears personal details when the user logs out", async () => {
    const form = createProfileForm();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    form.elements.namedItem("fullName").value = "Jane Doe";
    form.elements.namedItem("email").value = "user@example.com";
    form.elements.namedItem("mobileNumber").value = "599123456";
    form.elements.namedItem("dateOfBirth").value = "2002-06-15";
    form.elements.namedItem("preferredVenueId").value = "1";
    document.querySelector("#profile-eligibility").textContent =
      "You are 24, you can buy tickets for all age ratings";
    document.querySelector("#profile-eligibility").hidden = false;

    window.sessionStorage.clear();
    document.dispatchEvent(new Event("auth:logout"));

    for (const fieldName of [
      "fullName",
      "email",
      "mobileNumber",
      "dateOfBirth",
      "preferredVenueId",
    ]) {
      expect(form.elements.namedItem(fieldName).value).toBe("");
    }
    expect(document.querySelector("#profile-eligibility").hidden).toBe(true);
    expect(form.querySelector("[role='status']").textContent).toBe(
      "Log in to view and update your profile.",
    );
  });
});
