import { saveAuthSession } from "../../src/Auth/auth-session.js";
import { initializeProtectedActions } from "../../src/render-pages/protected-actions.js";

describe("protected actions", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    document.documentElement.removeAttribute("data-protected-actions-initialized");
    document.body.innerHTML = `
      <button class="login-button" type="button">Log In</button>
      <button data-requires-auth type="button">Select Seats</button>
    `;
    initializeProtectedActions(document);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    document.body.innerHTML = "";
  });

  it("opens login and resumes the original protected action after login", () => {
    const loginButton = document.querySelector(".login-button");
    const action = document.querySelector("[data-requires-auth]");
    const onAction = jest.fn();
    const onLogin = jest.fn();
    loginButton.addEventListener("click", onLogin);
    action.addEventListener("click", onAction);

    action.click();
    expect(onAction).not.toHaveBeenCalled();
    expect(onLogin).toHaveBeenCalledTimes(1);

    saveAuthSession(
      {
        user: {
          id: 1,
          username: "jane",
          email: "jane@example.com",
          avatar: null,
          fullName: null,
          mobileNumber: null,
          dateOfBirth: null,
          age: null,
          profileComplete: true,
        },
        token: "test-token",
      },
      window.sessionStorage,
    );
    document.dispatchEvent(new Event("auth:login"));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not intercept an action when a session already exists", () => {
    saveAuthSession(
      {
        user: {
          id: 1,
          username: "jane",
          email: "jane@example.com",
          avatar: null,
          fullName: null,
          mobileNumber: null,
          dateOfBirth: null,
          age: null,
          profileComplete: true,
        },
        token: "test-token",
      },
      window.sessionStorage,
    );
    const onAction = jest.fn();
    const action = document.querySelector("[data-requires-auth]");
    action.addEventListener("click", onAction);

    action.click();

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
