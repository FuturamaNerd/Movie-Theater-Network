const movie = {
  id: 21,
  slug: "family-adventure",
  title: "Family Adventure",
  kind: "film",
  runtimeMinutes: 112,
  posterUrl: "/assets/family-adventure-poster.jpg",
  backdropUrl: "/assets/family-adventure-backdrop.jpg",
  synopsis: "An adventure for the whole family.",
  releaseDate: "2026-10-01",
  isComingSoon: false,
  isFeatured: false,
  fromPrice: 12,
  ageRating: {
    code: "16+",
    minAge: 16,
    description: "Tickets require an account aged 16 or over.",
  },
  genres: [{ id: 1, slug: "adventure", name: "Adventure" }],
  formats: [{ id: 1, slug: "standard", name: "Standard", priceUplift: 0 }],
  availableDates: [
    "2026-10-11",
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
  ],
  director: "Alex Example",
  cast: "Actor One, Actor Two",
};

const showtimeGroups = [
  {
    venue: { id: 1, slug: "galleria", name: "Galleria Tbilisi", city: "Tbilisi" },
    sessions: [
      {
        id: 705,
        startsAt: "2026-10-11T20:00:00+00:00",
        date: "2026-10-11",
        time: "20:00",
        timeBand: "evening",
        price: 12,
        seatsLeft: 5,
        isSoldOut: false,
        hall: { id: 3, name: "C", venue: { id: 1, slug: "galleria", name: "Galleria Tbilisi", city: "Tbilisi" } },
        venue: { id: 1, slug: "galleria", name: "Galleria Tbilisi", city: "Tbilisi" },
        format: { id: 1, slug: "standard", name: "Standard", priceUplift: 0 },
        language: { id: 1, slug: "georgian-dub", name: "Georgian Dubbing", code: "GEO" },
      },
    ],
  },
];

const adultSession = {
  token: "adult-token",
  user: {
    id: 10,
    username: "parent",
    email: "parent@example.test",
    fullName: "Parent Example",
    dateOfBirth: "1985-05-10",
    age: 41,
    profileComplete: true,
  },
};

function mockFilmDetails({ currentUser, sessions = showtimeGroups } = {}) {
  cy.intercept("GET", "**/api/movies/family-adventure", {
    body: { data: movie },
  });
  cy.intercept("GET", "**/api/movies/family-adventure/sessions*", {
    body: { data: sessions },
  });
  cy.intercept("GET", "**/api/me", (request) => {
    if (!currentUser) {
      request.reply({ statusCode: 401, body: { message: "Unauthenticated." } });
      return;
    }
    request.reply({ body: { data: currentUser.user } });
  });
}

function visitFilmDetails(currentUser) {
  cy.visit("/pages/movie-details.html?movie=family-adventure", {
    onBeforeLoad(win) {
      if (currentUser) {
        win.sessionStorage.setItem("auth-session", JSON.stringify(currentUser));
      }
    },
  });
}

describe("Feature: Choosing a film and screening from its details", () => {
  it("lets a parent review a restricted film and select a screening for a family outing", () => {
    mockFilmDetails({ currentUser: adultSession });
    visitFilmDetails(adultSession);

    cy.contains("h1", movie.title).should("be.visible");
    cy.contains(movie.ageRating.description).should("be.visible");
    cy.get(".movie-details-showtime").should("be.visible");
    cy.get(".movie-details-showtime")
      .first()
      .should("contain", "Galleria Tbilisi")
      .and("contain", "20:00")
      .and("contain", "GEO")
      .and("contain", "₾12")
      .and("contain", "5 seats")
      .click();
    cy.location("pathname").should("eq", "/pages/seat-selection.html");
    cy.location("search").should("include", "sessionId=705");
  });

  it("offers the next seven days and groups showtimes under their venue", () => {
    mockFilmDetails();
    visitFilmDetails();

    cy.get(".movie-details-backdrop")
      .should("have.attr", "src")
      .and("include", "family-adventure-backdrop.jpg");
    cy.get(".movie-details-poster")
      .should("have.attr", "alt", "Poster for Family Adventure");
    cy.get("#movie-details-synopsis").should(
      "have.text",
      "An adventure for the whole family.",
    );
    cy.get("#movie-details-director").should("have.text", "Alex Example");
    cy.get("#movie-details-cast").should("have.text", "Actor One, Actor Two");
    cy.get("#movie-details-genres").should("have.text", "Adventure");
    cy.get("#movie-details-release").should("not.be.empty");
    cy.get("#movie-details-runtime").should("have.text", "112 min");
    cy.get("#movie-details-formats").should("contain", "Standard");
    cy.get("#movie-details-rating")
      .should("have.text", "16+")
      .and("have.attr", "title", movie.ageRating.description);
    cy.get(".movie-details-date-option").should("have.length", 7);
    cy.get(".movie-details-venue").should("contain", "Galleria Tbilisi");
    cy.get(".movie-details-showtime")
      .first()
      .should("contain", "20:00")
      .and("contain", "Standard")
      .and("contain", "GEO")
      .and("contain", "₾12")
      .and("contain", "5 seats")
      .find(".movie-details-showtime-format")
      .should("have.attr", "title", "Georgian Dubbing");
  });

  it("shows a no-showtimes message when the selected date has no screenings", () => {
    mockFilmDetails({ sessions: [] });
    visitFilmDetails();

    cy.contains(/no showtimes available/i).should("be.visible");
  });

  it("prompts a minor guest to sign in before checking age eligibility", () => {
    mockFilmDetails();
    visitFilmDetails();

    cy.get(".movie-details-showtime").first().click();
    cy.get("#loginModal").should("be.visible");
    cy.contains("You cannot buy tickets for it with this account").should(
      "not.exist",
    );
  });

  it("disables a restricted screening for a signed-in teen and explains the rating", () => {
    mockFilmDetails({
      currentUser: {
        token: "minor-token",
        user: {
          ...adultSession.user,
          username: "teen",
          email: "teen@example.test",
          dateOfBirth: "2012-05-10",
          age: 14,
        },
      },
    });
    visitFilmDetails({
      token: "minor-token",
      user: {
        ...adultSession.user,
        username: "teen",
        email: "teen@example.test",
        dateOfBirth: "2012-05-10",
        age: 14,
      },
    });

    cy.get(".movie-details-showtime")
      .first()
      .should("have.attr", "aria-disabled", "true")
      .and("not.have.attr", "href");
    cy.contains(
      "This film is rated 16+. You cannot buy tickets for it with this account.",
    ).should("be.visible");
    cy.location("pathname").should("eq", "/pages/movie-details.html");
  });

  it("checks a guest teen's age after sign-in and blocks an ineligible purchase", () => {
    const teenSession = {
      token: "minor-token",
      user: {
        ...adultSession.user,
        username: "teen",
        email: "teen@example.test",
        dateOfBirth: "2012-05-10",
        age: 14,
      },
    };
    mockFilmDetails();
    cy.intercept("POST", "**/api/login", {
      body: { data: teenSession },
    });
    cy.intercept("GET", "**/api/me", {
      body: { data: teenSession.user },
    });
    visitFilmDetails();

    cy.get(".movie-details-showtime").first().click();
    cy.get("#loginModal").should("be.visible");
    cy.get("#loginModal input[name='email']").type("teen@example.test");
    cy.get("#loginModal input[name='password']").type("teen-password");
    cy.get("#loginModal button[type='submit']").click();
    cy.contains(
      "This film is rated 16+. You cannot buy tickets for it with this account.",
    ).should("be.visible");
    cy.location("pathname").should("eq", "/pages/movie-details.html");
  });

  it("allows an authenticated adult to proceed when choosing a film to watch with a child", () => {
    mockFilmDetails({ currentUser: adultSession });
    visitFilmDetails(adultSession);

    cy.get(".movie-details-showtime").first().click();
    cy.location("pathname").should("eq", "/pages/seat-selection.html");
    cy.location("search").should("include", "sessionId=705");
  });
});
