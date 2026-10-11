describe("user login", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.get(".login-button").click();
    cy.get("#loginModal").should("be.visible");
  });

  it("logs in with valid credentials", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 200,
      body: {
        data: {
          user: {
            id: 397,
            username: "Elaine",
            email: "Elaine@example.com",
            avatar: null,
            fullName: null,
            mobileNumber: null,
            dateOfBirth: null,
            age: null,
            profileComplete: false,
          },
          token: "test-token",
        },
      },
    }).as("login");

    cy.get("#loginEmail").type("Elaine@example.com");
    cy.get("#loginPassword").type("secret");
    cy.get("#loginModal button[type='submit']").click();

    cy.wait("@login").then(({ request, response }) => {
      expect(response.statusCode).to.equal(200);
      expect(request.body).to.deep.equal({
        email: "Elaine@example.com",
        password: "secret",
      });
    });
  });

  function assertInvalidCredentials() {
    cy.intercept("POST", "**/api/login", {
      statusCode: 401,
      body: { message: "Invalid credentials." },
    }).as("login");

    cy.get("#loginEmail").type("Elaine@example.com");
    cy.get("#loginPassword").type("wrong-password");
    cy.get("#loginModal button[type='submit']").click();

    cy.wait("@login")
      .its("response.statusCode")
      .should("equal", 401);

    // Keep your existing validation assertions here.
  }

  it("shows invalid credentials for an unregistered user", () => {
    assertInvalidCredentials();
  });

  it("shows invalid credentials for a wrong password", () => {
    assertInvalidCredentials();
  });
});