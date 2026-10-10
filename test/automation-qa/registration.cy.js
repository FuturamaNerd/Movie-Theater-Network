describe("user registration", () => {
  it("submits a valid registration with the optional avatar omitted", () => {
    const username = `new-user-${Date.now()}`;
    const email = `${username}@example.com`;

    cy.intercept("POST", "**/signup-endpoint", {
      statusCode: 201,
      body: "<!doctype html><html><body><h1>Registration successful</h1></body></html>",
    }).as("register");

    cy.visit("/");
    cy.get(".sign-up-button").click();
    cy.get("#signupModal").should("exist");

    cy.get("#username").type(username);
    cy.get("#emailAddress").type(email);
    cy.get("#password").type("secret");
    cy.get("#confirmPassword").type("secret");

    cy.get("#avatarUpload").should("not.have.value");
    cy.get("#signupModal form").then(($form) => {
      expect($form[0].checkValidity()).to.equal(true);
    });
    cy.get("#signupModal form button[type='submit']").click();

    cy.wait("@register")
      .its("response.statusCode")
      .should("equal", 201);
  });
});
