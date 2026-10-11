function assertInvalidCredentials() {
  cy.intercept(
    "POST",
    "https://api.kinoxii.redberryinternship.ge/api/login",
    { statusCode: 401, body: { message: "Invalid credentials." } },
  ).as("login");

  cy.get("#loginEmail").type("Elaine@example.com");
  cy.get("#loginPassword").type("wrong-password");
  cy.get("#loginModal button[type='submit']").click();
  cy.wait("@login");

  for (const fieldId of ["loginEmail", "loginPassword"]) {
    cy.get(`#${fieldId}`)
      .should("have.attr", "aria-invalid", "true")
      .and("have.class", "registration-invalid");
    cy.get(`#login-${fieldId === "loginEmail" ? "email" : "password"}-message`)
      .should("be.visible")
      .and("have.text", "Invalid credentials.");
    cy.get(`#${fieldId}`)
      .parent()
      .find(".login-validation-icon")
      .should("be.visible")
      .and("have.attr", "src", "/styles/SVG/exclamation-warning-invalid.svg");
  }
}

describe("user login", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.get(".login-button").click();
    cy.get("#loginModal").should("be.visible");
  });

  it("logs in with valid credentials", () => {
    cy.intercept(
      "POST",
      "https://api.kinoxii.redberryinternship.ge/api/login",
      { statusCode: 200, body: { message: "Login successful" } },
    ).as("login");

    cy.get("#loginEmail").type("Elaine@example.com");
    cy.get("#loginPassword").type("secret");
    cy.get("#loginModal button[type='submit']").click();

    cy.wait("@login").then(({ request, response }) => {
      expect(response.statusCode).to.equal(200);
      expect(request.headers["content-type"]).to.include("application/json");
      expect(request.body).to.deep.equal({
        email: "Elaine@example.com",
        password: "secret",
      });
    });
    cy.get("#loginModal").should("not.have.class", "show");
  });

  it("shows invalid credentials for a user who is not registered", () => {
    assertInvalidCredentials();
  });

  it("shows invalid credentials for a wrong password", () => {
    assertInvalidCredentials();
  });

  it("opens the sign-up modal from the sign-up link", () => {
    cy.get(".login-signup-link").click();
    cy.get("#loginModal").should("not.have.class", "show");
    cy.get("#signupModal").should("be.visible");
  });
});
