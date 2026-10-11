import { saveAuthSession } from "../../src/Auth/auth-session.js";
import { initializeUserMenu } from "../../src/interactivity/user-menu.js";

describe("authenticated user menu", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    document.body.innerHTML = `
      <header>
        <div class="header-actions">
          <button class="sign-up-button" type="button">Sign Up</button>
          <button class="login-button" type="button">Log In</button>
        </div>
      </header>
    `;
  });

  afterEach(() => {
    delete window.fetch;
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("shows account initials and the incomplete-profile status for a signed-in user", () => {
    saveAuthSession({
      user: {
        id: 1,
        username: "jane1",
        email: "jane@example.com",
        avatar: null,
        fullName: "Jane Doe",
        mobileNumber: null,
        dateOfBirth: null,
        age: null,
        profileComplete: false,
      },
      token: "test-token",
    });

    initializeUserMenu(document);

    expect(document.querySelector(".sign-up-button").hidden).toBe(true);
    expect(document.querySelector(".login-button").hidden).toBe(true);
    expect(document.querySelector(".account-menu-trigger").hidden).toBe(false);
    expect(
      document.querySelector(".account-avatar-trigger .account-avatar-initials")
        .textContent,
    ).toBe("JD");
    expect(document.querySelector(".account-profile-notice").hidden).toBe(false);
    expect(
      document
        .querySelector(".account-avatar-trigger")
        .classList.contains("has-incomplete-profile"),
    ).toBe(true);
  });

  it("updates from the login and logout events", () => {
    initializeUserMenu(document);
    saveAuthSession({
      user: {
        id: 1,
        username: "jane1",
        email: "jane@example.com",
        avatar: null,
        fullName: null,
        mobileNumber: null,
        dateOfBirth: null,
        age: null,
        profileComplete: true,
      },
      token: "test-token",
    });
    document.dispatchEvent(new Event("auth:login"));

    expect(document.querySelector(".account-menu").hidden).toBe(false);
    expect(document.querySelector(".account-profile-notice").hidden).toBe(true);

    window.sessionStorage.clear();
    document.dispatchEvent(new Event("auth:logout"));

    expect(document.querySelector(".account-menu").hidden).toBe(true);
    expect(document.querySelector(".sign-up-button").hidden).toBe(false);
    expect(document.querySelector(".login-button").hidden).toBe(false);
  });

  it("opens the dropdown and closes it on Escape", () => {
    saveAuthSession({
      user: {
        id: 1,
        username: "jane1",
        email: "jane@example.com",
        avatar: null,
        fullName: null,
        mobileNumber: null,
        dateOfBirth: null,
        age: null,
        profileComplete: true,
      },
      token: "test-token",
    });
    initializeUserMenu(document);

    const trigger = document.querySelector(".account-menu-trigger");
    trigger.click();
    expect(document.querySelector(".account-menu-panel").hidden).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector(".account-menu-panel").hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("logs out and restores the signed-out buttons", async () => {
    saveAuthSession({
      user: {
        id: 1,
        username: "jane1",
        email: "jane@example.com",
        avatar: null,
        fullName: null,
        mobileNumber: null,
        dateOfBirth: null,
        age: null,
        profileComplete: true,
      },
      token: "test-token",
    });
    window.fetch = jest.fn().mockResolvedValue({ status: 204 });
    initializeUserMenu(document);

    document.querySelector(".account-menu-logout").click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(window.fetch).toHaveBeenCalledWith(
      "https://api.kinoxii.redberryinternship.ge/api/logout",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer test-token",
        },
      },
    );
    expect(document.querySelector(".account-menu").hidden).toBe(true);
    expect(document.querySelector(".login-button").hidden).toBe(false);
  });
});
