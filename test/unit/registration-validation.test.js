import {
  initializeRegistrationForm,
  validateRegistration,
} from "../../src/Auth/registration-validation.js";

const availableAccounts = {
  existingUsernames: ["existing-user"],
  existingEmails: ["existing@example.com"],
};

const validRegistration = {
  username: "new-user",
  email: "new@example.com",
  password: "secret",
  confirmPassword: "secret",
};

describe("registration validation", () => {
  it("accepts a valid registration without an avatar", () => {
    expect(
      validateRegistration(validRegistration, availableAccounts),
    ).toMatchObject({ isValid: true });
  });

  it.each([
    {
      name: "missing username",
      registration: { ...validRegistration, username: "" },
      field: "username",
    },
    {
      name: "username shorter than three characters",
      registration: { ...validRegistration, username: "ab" },
      field: "username",
    },
    {
      name: "duplicate username",
      registration: { ...validRegistration, username: "existing-user" },
      field: "username",
    },
    {
      name: "missing email",
      registration: { ...validRegistration, email: "" },
      field: "email",
    },
    {
      name: "malformed email",
      registration: { ...validRegistration, email: "not-an-email" },
      field: "email",
    },
    {
      name: "duplicate email",
      registration: { ...validRegistration, email: "existing@example.com" },
      field: "email",
    },
    {
      name: "missing password",
      registration: { ...validRegistration, password: "" },
      field: "password",
    },
    {
      name: "password shorter than three characters",
      registration: { ...validRegistration, password: "ab", confirmPassword: "ab" },
      field: "password",
    },
    {
      name: "non-matching confirmation",
      registration: { ...validRegistration, confirmPassword: "different" },
      field: "confirmPassword",
    },
  ])("rejects a registration with $name", ({ registration, field }) => {
    const result = validateRegistration(registration, availableAccounts);

    expect(result.isValid).toBe(false);
    expect(result.errors[field]).toBeTruthy();
  });

  it.each([
    { name: "JPG", avatar: { name: "avatar.jpg", type: "image/jpeg" } },
    { name: "PNG", avatar: { name: "avatar.png", type: "image/png" } },
    { name: "WebP", avatar: { name: "avatar.webp", type: "image/webp" } },
  ])("accepts an optional $name avatar", ({ avatar }) => {
    expect(
      validateRegistration({ ...validRegistration, avatar }, availableAccounts),
    ).toMatchObject({ isValid: true });
  });

  it("rejects an avatar that is not JPG, PNG, or WebP", () => {
    const result = validateRegistration(
      {
        ...validRegistration,
        avatar: { name: "avatar.gif", type: "image/gif" },
      },
      availableAccounts,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.avatar).toBeTruthy();
  });

  describe("registration form feedback", () => {
    let form;

    beforeEach(() => {
      document.body.innerHTML = `
        <form>
          <input name="username" />
          <input name="email" />
          <input name="password" />
          <input name="confirmPassword" />
          <input name="avatar" type="file" />
        </form>
      `;
      form = document.querySelector("form");
      initializeRegistrationForm(form);
    });

    afterEach(() => {
      delete global.fetch;
    });

    function enterValue(fieldName, value) {
      const field = form.elements.namedItem(fieldName);
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return field;
    }

    it("shows a green checkmark when a field is valid", () => {
      const username = enterValue("username", "new-user");
      const icon = username.parentElement.querySelector(
        ".registration-validation-icon",
      );

      expect(username.classList.contains("registration-valid")).toBe(true);
      expect(username.getAttribute("aria-invalid")).toBe("false");
      expect(icon.getAttribute("src")).toBe("/styles/SVG/checkmark-valid.svg");
      expect(icon.hidden).toBe(false);
      expect(
        form.querySelector("#username-validation-message").hidden,
      ).toBe(true);
    });

    it("shows a red invalid state and an explanation below the field", () => {
      const username = enterValue("username", "ab");
      const icon = username.parentElement.querySelector(
        ".registration-validation-icon",
      );
      const message = form.querySelector("#username-validation-message");

      expect(username.classList.contains("registration-invalid")).toBe(true);
      expect(username.getAttribute("aria-invalid")).toBe("true");
      expect(icon.getAttribute("src")).toBe(
        "/styles/SVG/exclamation-warning-invalid.svg",
      );
      expect(icon.hidden).toBe(false);
      expect(message.hidden).toBe(false);
      expect(message.textContent).toBe(
        "the username field must be at least 3 characters.",
      );
      expect(message.previousElementSibling).toBe(username.parentElement);
    });

    it("explains when confirmation password does not match", () => {
      enterValue("password", "secret");
      const confirmation = enterValue("confirmPassword", "different");
      const message = form.querySelector("#confirmPassword-validation-message");

      expect(confirmation.classList.contains("registration-invalid")).toBe(
        true,
      );
      expect(message.textContent).toBe(
        "The password field confirmation does not match.",
      );
    });

    it("submits the API multipart fields with an empty avatar when omitted", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });
      enterValue("username", "Elaine");
      enterValue("email", "Elaine@example.com");
      enterValue("password", "secret");
      enterValue("confirmPassword", "secret");

      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe("https://api.kinoxii.redberryinternship.ge/api/register");
      expect(options.method).toBe("POST");
      expect(options.headers).toBeUndefined();
      expect([...options.body.entries()]).toEqual([
        ["username", "Elaine"],
        ["email", "Elaine@example.com"],
        ["password", "secret"],
        ["password_confirmation", "secret"],
        ["avatar", ""],
      ]);
    });

    it("includes an uploaded avatar in the API multipart fields", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });
      enterValue("username", "Elaine");
      enterValue("email", "Elaine@example.com");
      enterValue("password", "secret");
      enterValue("confirmPassword", "secret");
      const avatar = new File(["image"], "avatar.png", { type: "image/png" });
      Object.defineProperty(form.elements.namedItem("avatar"), "files", {
        configurable: true,
        value: [avatar],
      });

      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const [, options] = global.fetch.mock.calls[0];
      expect([...options.body.entries()]).toEqual([
        ["username", "Elaine"],
        ["email", "Elaine@example.com"],
        ["password", "secret"],
        ["password_confirmation", "secret"],
        ["avatar", avatar],
      ]);
    });
  });
});
