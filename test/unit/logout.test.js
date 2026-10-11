import { logout } from "../../src/Auth/logout.js";
import { getAuthSession, saveAuthSession } from "../../src/Auth/auth-session.js";

const LOGOUT_ENDPOINT = "https://api.kinoxii.redberryinternship.ge/api/logout";

describe("logout", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    document.body.innerHTML = '<button class="login-button">Log in</button>';
    saveAuthSession({ user: { id: 1, username: "test-user" }, token: "old-token" });
  });

  afterEach(() => {
    delete window.fetch;
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("posts the current bearer token and clears this session after revocation", async () => {
    window.fetch = jest.fn().mockResolvedValue({ status: 204 });

    await logout(document);

    expect(window.fetch).toHaveBeenCalledWith(LOGOUT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer old-token",
      },
    });
    expect(getAuthSession()).toBeNull();
  });

  it("opens login and retries once with the new token after an unauthorized response", async () => {
    const loginButton = document.querySelector(".login-button");
    const openLoginModal = jest.spyOn(loginButton, "click");
    window.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ status: 204 });

    loginButton.addEventListener("click", () => {
      saveAuthSession({
        user: { id: 2, username: "new-user" },
        token: "new-token",
      });
      document.dispatchEvent(new Event("auth:login"));
    });

    await logout(document);

    expect(openLoginModal).toHaveBeenCalledTimes(1);
    expect(window.fetch).toHaveBeenNthCalledWith(1, LOGOUT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer old-token",
      },
    });
    expect(window.fetch).toHaveBeenNthCalledWith(2, LOGOUT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer new-token",
      },
    });
    expect(getAuthSession()).toBeNull();
  });

  it("does not retry indefinitely when the retried request is unauthorized", async () => {
    window.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ status: 401 });
    document.querySelector(".login-button").addEventListener("click", () => {
      saveAuthSession({
        user: { id: 2, username: "new-user" },
        token: "new-token",
      });
      document.dispatchEvent(new Event("auth:login"));
    });

    await expect(logout(document)).rejects.toThrow("Logout failed: 401");

    expect(window.fetch).toHaveBeenCalledTimes(2);
    expect(getAuthSession()).toBeNull();
  });

  it("does not call the endpoint without an authenticated session", async () => {
    window.sessionStorage.clear();
    window.fetch = jest.fn();

    await expect(logout(document)).rejects.toThrow(
      "Cannot log out without an authenticated session",
    );

    expect(window.fetch).not.toHaveBeenCalled();
  });
});
