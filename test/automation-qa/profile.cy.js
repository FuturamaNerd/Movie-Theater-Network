const PROFILE_ENDPOINT = "**/api/profile";
const FILTER_OPTIONS_ENDPOINT = "**/api/filter-options";

const user = {
  id: 2,
  username: "jane",
  email: "user@example.com",
  avatar: null,
  fullName: "Jane Doe",
  mobileNumber: "599123456",
  dateOfBirth: "2002-06-15",
  age: 24,
  preferredVenue: null,
  profileComplete: true,
};

describe("profile update", () => {
  it("saves profile data and reflects the completed profile across the UI", () => {
    cy.intercept("GET", FILTER_OPTIONS_ENDPOINT, {
      statusCode: 200,
      body: {
        data: {
          venues: [
            { id: 2, slug: "batumi", name: "Batumi Boulevard", city: "Batumi" },
            { id: 1, slug: "galleria", name: "Galleria Tbilisi", city: "Tbilisi" },
            { id: 3, slug: "rustaveli", name: "Rustaveli Palace", city: "Tbilisi" },
            { id: 4, slug: "vake", name: "Vake Park", city: "Tbilisi" },
          ],
        },
      },
    }).as("filterOptions");
    cy.intercept("PUT", PROFILE_ENDPOINT, (request) => {
      expect(request.headers.authorization).to.equal("Bearer profile-e2e-token");
      expect(request.body).to.include("Jane Doe");
      expect(request.body).to.include("599123456");
      expect(request.body).not.to.include("changed@example.com");
      request.reply({
        statusCode: 200,
        body: {
          data: {
            ...user,
            preferredVenue: { id: 1, slug: "galleria", name: "Galleria Tbilisi" },
          },
        },
      });
    }).as("updateProfile");

    cy.visit("/pages/my-proflie.html", {
      onBeforeLoad(win) {
        win.sessionStorage.setItem(
          "auth-session",
          JSON.stringify({
            user: {
              ...user,
              fullName: null,
              mobileNumber: null,
              dateOfBirth: null,
              age: null,
              profileComplete: false,
            },
            token: "profile-e2e-token",
          }),
        );
      },
    });

    cy.get("#full-name").clear().type("Jane Doe");
    cy.get("#email")
      .should("have.value", "user@example.com")
      .and("have.attr", "readonly");
    cy.get("#mobile").clear().type("599 123 456");
    cy.get("#birth-date").type("2002-06-15");
    cy.get("#profile-incomplete-banner").should("be.visible");
    cy.wait("@filterOptions");
    cy.get("#venue option").should("have.length", 5);
    cy.get("#venue option").then(($options) => {
      expect([...$options].map((option) => option.textContent)).to.include.members([
        "Batumi Boulevard — Batumi",
        "Galleria Tbilisi — Tbilisi",
        "Rustaveli Palace — Tbilisi",
        "Vake Park — Tbilisi",
      ]);
    });
    cy.get("#venue").select("1");
    cy.get("#profile-form button[type='submit']").click();

    cy.wait("@updateProfile").then(({ request, response }) => {
      expect(request.method).to.equal("PUT");
      expect(request.body).to.include("599123456");
      expect(request.body).to.include("name=\"preferredVenueId\"");
      expect(response.statusCode).to.equal(200);
      expect(response.body.data.profileComplete).to.equal(true);
      expect(response.body.data.age).to.equal(24);
    });

    cy.get("#profile-incomplete-banner").should("not.be.visible");
    cy.get("#profile-eligibility")
      .should("be.visible")
      .and("have.text", "You are 24, you can buy tickets for all age ratings");
    cy.get(".account-avatar-trigger")
      .should("be.visible")
      .and("not.have.class", "has-incomplete-profile");
    cy.get(".account-profile-notice").should("not.be.visible");

    cy.intercept("POST", "**/api/logout", { statusCode: 204 }).as("logout");
    cy.get(".account-menu-trigger").click();
    cy.get(".account-menu-logout").click();
    cy.wait("@logout");
    cy.location("pathname").should("eq", "/");
  });
});
