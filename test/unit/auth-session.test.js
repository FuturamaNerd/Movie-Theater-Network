import {
  clearAuthSession,
  getAuthSession,
  handleUnauthorizedResponse,
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
});
