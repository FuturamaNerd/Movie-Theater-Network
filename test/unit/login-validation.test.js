import {
  initializeLoginForm,
  initializeLoginModal,
  validateLogin,
} from "../../src/Auth/login-validation.js";

describe("login validation", () => {
  afterEach(() => {
    delete window.bootstrap;
    delete window.fetch;
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("reuses registration email and password validation", () => {
    expect(validateLogin({ email: "bad-email", password: "x" })).toMatchObject({
      isValid: false,
      errors: {
        email: "The email field must be a valid email address.",
        password: "The password field must be at least 3 characters.",
      },
    });
    expect(
      validateLogin({ email: "user@example.com", password: "secret" }),
    ).toMatchObject({ isValid: true });
  });

  function createLoginForm() {
    document.body.innerHTML = `
      <button class="sign-up-button" type="button">Sign up</button>
      <div id="loginModal">
        <form>
          <div class="login-field">
            <input name="email" type="email" />
          </div>
          <div class="login-field">
            <input name="password" type="password" />
          </div>
          <a class="login-signup-link" href="#signup">Sign up</a>
          <p role="status" hidden></p>
        </form>
      </div>
    `;
    const form = document.querySelector("#loginModal form");
    initializeLoginForm(form, document);
    return form;
  }

  function enterCredentials(form, email = "Elaine@example.com", password = "secret") {
    const emailField = form.elements.namedItem("email");
    const passwordField = form.elements.namedItem("password");
    emailField.value = email;
    emailField.dispatchEvent(new Event("input", { bubbles: true }));
    passwordField.value = password;
    passwordField.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it.each(["unregistered user", "wrong password"])(
    "shows invalid credentials for a %s",
    async () => {
      const form = createLoginForm();
      enterCredentials(form);
      window.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false });

      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      for (const fieldName of ["email", "password"]) {
        const field = form.elements.namedItem(fieldName);
        const icon = field.parentElement.querySelector(
          ".login-validation-icon",
        );
        const message = form.querySelector(`#login-${fieldName}-message`);
        expect(field.classList.contains("registration-invalid")).toBe(true);
        expect(field.getAttribute("aria-invalid")).toBe("true");
        expect(icon.getAttribute("src")).toBe(
          "/styles/SVG/exclamation-warning-invalid.svg",
        );
        expect(message.textContent).toBe("Invalid credentials.");
        expect(message.hidden).toBe(false);
      }
    },
  );

  it("shows shared email and password validation feedback while typing", () => {
    const form = createLoginForm();
    const emailField = form.elements.namedItem("email");
    emailField.value = "bad-email";
    emailField.dispatchEvent(new Event("input", { bubbles: true }));

    expect(emailField.classList.contains("registration-invalid")).toBe(true);
    expect(
      form.querySelector("#login-email-message").textContent,
    ).toBe("The email field must be a valid email address.");
    expect(
      emailField.parentElement.querySelector(".login-validation-icon").src,
    ).toContain("/styles/SVG/exclamation-warning-invalid.svg");
    expect(
      form.elements.namedItem("password").classList.contains(
        "registration-invalid",
      ),
    ).toBe(false);
  });

  it("posts valid credentials and announces successful login", async () => {
    const form = createLoginForm();
    enterCredentials(form, " Elaine@example.com ", "secret");
    window.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true });
    const loginEvent = jest.fn();
    document.addEventListener("auth:login", loginEvent);
    const hide = jest.fn();
    window.bootstrap = {
      Modal: { getOrCreateInstance: jest.fn().mockReturnValue({ hide }) },
    };

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(window.fetch).toHaveBeenCalledWith(
      "https://api.kinoxii.redberryinternship.ge/api/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "Elaine@example.com",
          password: "secret",
        }),
      },
    );
    expect(loginEvent).toHaveBeenCalledTimes(1);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("opens the signup flow after closing the login modal", () => {
    const form = createLoginForm();
    const signupButton = document.querySelector(".sign-up-button");
    const clickSignup = jest.spyOn(signupButton, "click");
    const hide = jest.fn();
    window.bootstrap = {
      Modal: { getOrCreateInstance: jest.fn().mockReturnValue({ hide }) },
    };

    form.querySelector(".login-signup-link").click();
    expect(hide).toHaveBeenCalledTimes(1);
    document
      .querySelector("#loginModal")
      .dispatchEvent(new Event("hidden.bs.modal"));

    expect(clickSignup).toHaveBeenCalledTimes(1);
  });

  it("loads and opens the login modal from the header button", async () => {
    const modalMarkup = `
      <div id="loginModal">
        <form>
          <div class="login-field"><input name="email" /></div>
          <div class="login-field"><input name="password" /></div>
          <a class="login-signup-link" href="#signup">Sign up</a>
        </form>
      </div>
    `;
    document.body.innerHTML = '<button class="login-button">Log in</button>';
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(modalMarkup),
    });
    const show = jest.fn();
    window.bootstrap = {
      Modal: { getOrCreateInstance: jest.fn().mockReturnValue({ show }) },
    };
    initializeLoginModal(document);

    document.querySelector(".login-button").click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(window.fetch).toHaveBeenCalledWith(
      "/supplementary-content/login-modal.html",
    );
    expect(show).toHaveBeenCalledTimes(1);
    expect(document.querySelector("#loginModal form").dataset.loginInitialized).toBe(
      "true",
    );
  });
});
