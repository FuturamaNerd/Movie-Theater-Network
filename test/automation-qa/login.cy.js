const LOGIN_ENDPOINT = "**/api/login";

const validUser = {
  id: 123,
  username: "Elaine",
  email: "Elaine@example.com",
  avatar: null,
  fullName: null,
  mobileNumber: null,
  dateOfBirth: null,
  age: null,
  profileComplete: false,
};

function openModal(triggerSelector, modalSelector) {
  cy.get(triggerSelector).then(($trigger) => {
    const modalShown = new Cypress.Promise((resolve) => {
      $trigger[0].ownerDocument.addEventListener(
        "shown.bs.modal",
        resolve,
        { once: true },
      );
    });
    $trigger[0].click();
    return modalShown;
  });
  cy.get(modalSelector).should("be.visible");
}

function assertInvalidCredentials(email, password) {
  cy.intercept("POST", LOGIN_ENDPOINT, {
    statusCode: 401,
    body: { message: "Unauthenticated." },
  }).as("login");

  cy.get("#loginEmail").clear().type(email);
  cy.get("#loginPassword").clear().type(password);
  cy.get("#loginModal button[type='submit']").click();

  cy.wait("@login").then(({ request, response }) => {
    expect(request.body).to.deep.equal({ email, password });
    expect(response.statusCode).to.equal(401);
    expect(response.body).to.deep.equal({ message: "Unauthenticated." });
  });

  for (const fieldId of ["loginEmail", "loginPassword"]) {
    cy.get(`#${fieldId}`)
      .should("have.attr", "aria-invalid", "true")
      .and("have.class", "registration-invalid");
    cy.get(`#login-${fieldId === "loginEmail" ? "email" : "password"}-message`)
      .should("be.visible")
      .and("have.text", "Invalid credentials.");
  }
}

describe("login", () => {
  beforeEach(() => {
    cy.visit("/");
    openModal(".login-button", "#loginModal");
  });

  it("submits credentials, stores the API session, and shows the account menu", () => {
    cy.intercept("POST", LOGIN_ENDPOINT, {
      statusCode: 200,
      body: { data: { user: validUser, token: "test-token" } },
    }).as("login");

    cy.get("#loginEmail").type(validUser.email);
    cy.get("#loginPassword").type("secret");
    cy.get("#loginModal button[type='submit']").click();

    cy.wait("@login").then(({ request, response }) => {
      expect(request.headers["content-type"]).to.include("application/json");
      expect(request.body).to.deep.equal({
        email: validUser.email,
        password: "secret",
      });
      expect(response.statusCode).to.equal(200);
      expect(response.body.data).to.deep.equal({
        user: validUser,
        token: "test-token",
      });
    });

    cy.get("#loginModal").should("not.have.class", "show");
    cy.get(".sign-up-button").should("not.be.visible");
    cy.get(".login-button").should("not.be.visible");
    cy.get(".account-menu-trigger")
      .should("be.visible")
      .and("contain.text", validUser.username);
    cy.get(".account-avatar-trigger")
      .should("have.class", "has-incomplete-profile")
      .find(".account-avatar-initials")
      .should("be.visible")
      .and("have.text", "EL");
    cy.get(".account-menu-trigger").click();
    cy.get(".account-profile-notice")
      .should("be.visible")
      .and("contain.text", "Profile incomplete");
  });

  it("shows the API's unauthenticated response for an unknown account", () => {
    assertInvalidCredentials("unknown@example.com", "secret");
  });

  it("shows the API's unauthenticated response for an incorrect password", () => {
    assertInvalidCredentials(validUser.email, "wrong-password");
  });

  it("switches from login to sign-up after closing the login modal", () => {
    cy.get("#loginModal .login-signup-link").click();
    cy.get("#loginModal").should("not.have.class", "show");
    cy.get("#signupModal").should("be.visible");
  });
});
