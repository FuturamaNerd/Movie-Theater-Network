import {
  clearAuthSession,
  getAuthSession,
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
});
