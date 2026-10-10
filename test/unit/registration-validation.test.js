import { validateRegistration } from "../../src/interactivity/registration-validation.js";

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
});
