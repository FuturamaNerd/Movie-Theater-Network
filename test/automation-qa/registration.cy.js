const REGISTER_ENDPOINT = "**/api/register";
const LOGIN_ENDPOINT = "**/api/login";

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

describe("registration", () => {
  it("registers an account and logs in with the same credentials", () => {
    const account = {
      username: "E2EUser",
      email: "elainee2e@example.com",
      password: "secret",
    };
    const user = {
      id: 456,
      username: account.username,
      email: account.email,
      avatar: null,
      fullName: null,
      mobileNumber: null,
      dateOfBirth: null,
      age: null,
      profileComplete: false,
    };
    let registered = false;

    cy.intercept("POST", REGISTER_ENDPOINT, (request) => {
      expect(request.headers["content-type"]).to.include("multipart/form-data");
      expect(request.body).to.include(account.email);
      registered = true;
      request.reply({
        statusCode: 201,
        body: { message: "Registration successful." },
      });
    }).as("register");

    cy.intercept("POST", LOGIN_ENDPOINT, (request) => {
      if (
        registered &&
        request.body.email === account.email &&
        request.body.password === account.password
      ) {
        request.reply({
          statusCode: 200,
          body: { data: { user, token: "registered-user-token" } },
        });
        return;
      }

      request.reply({
        statusCode: 401,
        body: { message: "Unauthenticated." },
      });
    }).as("login");

    cy.visit("/");
    openModal(".sign-up-button", "#signupModal");
    cy.get("#username").type(account.username);
    cy.get("#emailAddress").type(account.email).should("have.value", account.email);
    cy.get("#password").type(account.password);
    cy.get("#confirmPassword").type(account.password);
    cy.get("#signupModal button[type='submit']").click();

    cy.wait("@register").then(({ response }) => {
      expect(response.statusCode).to.equal(201);
      expect(registered).to.equal(true);
    });
    cy.get("#signupModal [role='status']")
      .should("be.visible")
      .and("contain.text", "Registration successful.");

    cy.get("#signupModal .signup-login-prompt a").click();
    cy.get("#signupModal").should("not.have.class", "show");
    cy.get("#loginModal").should("be.visible");

    cy.get("#loginEmail").type(account.email).should("have.value", account.email);
    cy.get("#loginPassword").type(account.password);
    cy.get("#loginModal button[type='submit']").click();
    cy.wait("@login").then(({ request, response }) => {
      expect(request.body).to.deep.equal({
        email: account.email,
        password: account.password,
      });
      expect(response.statusCode).to.equal(200);
      expect(response.body.data.token).to.equal("registered-user-token");
    });

    cy.get("#loginModal").should("not.have.class", "show");
    cy.get(".account-menu-trigger")
      .should("be.visible")
      .and("contain.text", account.username);
  });

  it("shows the API validation response for a duplicate account", () => {
    cy.intercept("POST", REGISTER_ENDPOINT, {
      statusCode: 422,
      body: {
        message: "The given data was invalid.",
        errors: { email: ["The email has already been taken."] },
      },
    }).as("register");

    cy.visit("/");
    openModal(".sign-up-button", "#signupModal");
    cy.get("#username").type("Existing User");
    cy.get("#emailAddress").type("existing@example.com");
    cy.get("#password").type("secret");
    cy.get("#confirmPassword").type("secret");
    cy.get("#signupModal button[type='submit']").click();

    cy.wait("@register").its("response.statusCode").should("equal", 422);
    cy.get("#signupModal [role='status']")
      .should("be.visible")
      .and("contain.text", "Registration failed");
  });
});
