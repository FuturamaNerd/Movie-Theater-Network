describe("user registration", () => {
  it("submits a valid registration with the optional avatar omitted", () => {
    const username = `new-user-${Date.now()}`;
    const email = `${username}@example.com`;

    cy.intercept(
      "POST",
      "https://api.kinoxii.redberryinternship.ge/api/register",
      {
      statusCode: 201,
      body: { message: "Registration successful" },
      },
    ).as("register");

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
      .then(({ request, response }) => {
        expect(response.statusCode).to.equal(201);
        expect(request.headers["content-type"]).to.include("application/json");
        expect(request.body).to.include({
          username,
          email,
          password: "secret",
          confirmPassword: "secret",
        });
        expect(request.body).not.to.have.property("avatar");
      });
  });
});
