import {
  clearAuthSession,
  getAuthSession,
  handleUnauthorizedResponse,
  restoreAuthSession,
  saveAuthSession,
} from "../../src/Auth/auth-session.js";

describe("authentication session", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stores and retrieves the authenticated user and token", () => {
    const session = {
      user: { id: 1, username: "test-user" },
      token: "test-token",
    };

    saveAuthSession(session);

    expect(getAuthSession()).toEqual(session);
  });

  it("returns null when no session exists", () => {
    expect(getAuthSession()).toBeNull();
  });

  it("clears the current session", () => {
    saveAuthSession({
      user: { id: 1, username: "test-user" },
      token: "test-token",
    });

    clearAuthSession();

    expect(getAuthSession()).toBeNull();
  });

  it("rejects an invalid session", () => {
    expect(() =>
      saveAuthSession({ user: { id: 1 }, token: "" }),
    ).toThrow("A user and authentication token are required");
  });

  it("clears an expired session and announces unauthorized access", () => {
    saveAuthSession(
      { user: { id: 1, username: "test-user" }, token: "test-token" },
      window.sessionStorage,
    );
    const logoutEvent = jest.fn();
    const unauthorizedEvent = jest.fn();
    document.addEventListener("auth:logout", logoutEvent);
    document.addEventListener("auth:unauthorized", unauthorizedEvent);
    const response = { status: 401 };

    expect(handleUnauthorizedResponse(response, document)).toBe(response);

    expect(getAuthSession(window.sessionStorage)).toBeNull();
    expect(logoutEvent).toHaveBeenCalledTimes(1);
    expect(unauthorizedEvent).toHaveBeenCalledTimes(1);
    document.removeEventListener("auth:logout", logoutEvent);
    document.removeEventListener("auth:unauthorized", unauthorizedEvent);
  });

  it("refreshes the current user from the API while preserving the token", async () => {
    saveAuthSession(
      { user: { id: 1, username: "old-name" }, token: "restore-token" },
      window.sessionStorage,
    );
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 1,
          username: "new-name",
          email: "jane@example.com",
          profileComplete: true,
        },
      }),
    });

    const restored = await restoreAuthSession(document);

    expect(window.fetch).toHaveBeenCalledWith(
      "https://api.kinoxii.redberryinternship.ge/api/me",
      {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer restore-token",
        },
      },
    );
    expect(restored).toEqual({
      user: {
        id: 1,
        username: "new-name",
        email: "jane@example.com",
        profileComplete: true,
      },
      token: "restore-token",
    });
    expect(getAuthSession().user.profileComplete).toBe(true);
  });

  it("clears an expired stored token without opening the login flow", async () => {
    saveAuthSession(
      { user: { id: 1, username: "jane" }, token: "expired-token" },
      window.sessionStorage,
    );
    window.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const unauthorizedEvent = jest.fn();
    document.addEventListener("auth:unauthorized", unauthorizedEvent);

    await expect(restoreAuthSession(document)).resolves.toBeNull();

    expect(getAuthSession()).toBeNull();
    expect(unauthorizedEvent).not.toHaveBeenCalled();
    document.removeEventListener("auth:unauthorized", unauthorizedEvent);
  });
});
