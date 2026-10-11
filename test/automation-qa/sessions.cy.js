const movie = {
  id: 21,
  slug: "quiet-galaxy",
  title: "Quiet Galaxy",
  kind: "film",
  runtimeMinutes: 112,
  posterUrl: "/assets/quiet-galaxy.jpg",
  backdropUrl: "/assets/quiet-galaxy-backdrop.jpg",
  releaseDate: "2026-10-01",
  isComingSoon: false,
  isFeatured: false,
  fromPrice: 12,
  ageRating: { code: "12+", minAge: 12, description: "12+" },
  genres: [],
  formats: [],
};

const venues = [
  {
    id: 1,
    slug: "galleria",
    name: "Galleria Tbilisi",
    city: "Tbilisi",
    formats: [{ id: 2, slug: "max", name: "MAX", priceUplift: 6 }],
  },
  {
    id: 2,
    slug: "vake",
    name: "Vake Park",
    city: "Tbilisi",
    formats: [{ id: 1, slug: "standard", name: "Standard", priceUplift: 0 }],
  },
  {
    id: 3,
    slug: "batumi",
    name: "Batumi Boulevard",
    city: "Batumi",
    formats: [{ id: 3, slug: "atmos", name: "ATMOS", priceUplift: 4 }],
  },
];

const filterOptions = {
  venues,
  formats: [
    { id: 1, slug: "standard", name: "Standard", priceUplift: 0 },
    { id: 2, slug: "max", name: "MAX", priceUplift: 6 },
    { id: 3, slug: "atmos", name: "ATMOS", priceUplift: 4 },
  ],
  languages: [
    { id: 1, slug: "georgian-dub", name: "Georgian Dubbing", code: "GEO" },
    {
      id: 2,
      slug: "georgian-subtitles",
      name: "Georgian Subtitles",
      code: "ENG",
    },
  ],
  timeBands: [
    { id: "morning", label: "Morning (before 12:00)" },
    { id: "afternoon", label: "Afternoon (12:00 - 18:00)" },
    { id: "evening", label: "Evening (after 18:00)" },
  ],
  sorts: [
    { id: "time_asc", label: "Showtime: earliest first" },
    { id: "time_desc", label: "Showtime: latest first" },
    { id: "price_asc", label: "Price: low to high" },
    { id: "price_desc", label: "Price: high to low" },
    { id: "title_asc", label: "Title: A-Z" },
  ],
};

const showing = {
  id: 705,
  startsAt: "2026-10-11T20:00:00+00:00",
  date: "2026-10-11",
  time: "20:00",
  timeBand: "evening",
  price: 12,
  seatsLeft: 5,
  isSoldOut: false,
  hall: { id: 3, name: "C", venue: venues[0] },
  venue: venues[0],
  format: filterOptions.formats[1],
  language: filterOptions.languages[1],
  movie,
};

const response = {
  data: [
    { movie, sessions: [showing, { ...showing, id: 706, time: "21:00", isSoldOut: true, seatsLeft: 0 }] },
  ],
  meta: {
    currentPage: 1,
    lastPage: 2,
    perPage: 10,
    totalSessions: 2,
    totalMovies: 11,
    date: "2026-10-11",
  },
};

function givenSessionsPage() {
  cy.intercept("GET", "**/api/filter-options", { body: { data: filterOptions } });
  cy.intercept("GET", "**/api/sessions**", { body: response }).as("sessions");
  cy.visit("/pages/sessions.html");
  cy.wait("@sessions");
}

describe("Feature: Finding a screening that fits my plans", () => {
  beforeEach(givenSessionsPage);

  it("As a premium-format fan, I can choose a venue and see only its available formats", () => {
    cy.get('input[name="venues[]"][value="galleria"]').check();
    cy.get('input[name="formats[]"][value="max"]').should("exist");
    cy.get('input[name="formats[]"][value="standard"]').should("not.exist");
    cy.location("search").should("include", "venue=galleria");
    cy.location("search").should("include", "page=1");
  });

  it("As a subtitle-preferring night owl, I can combine language and evening filters", () => {
    cy.get('input[name="languages[]"][value="georgian-subtitles"]').check();
    cy.get('input[name="bands[]"][value="evening"]').check();
    cy.get("#active-filter-count").should("have.text", "2 filters active");
    cy.location("search").should("include", "language=georgian-subtitles");
    cy.location("search").should("include", "band=evening");
    cy.get(".session-showtime-time").first().should("contain", "20:00");
  });

  it("As a budget-conscious viewer, I can sort showtimes by the lowest price", () => {
    cy.get("#sessions-sort").select("price_asc");
    cy.location("search").should("include", "sort=price_asc");
    cy.location("search").should("include", "page=1");
    cy.get(".session-showtime-price").first().should("contain", "from ₾12");
  });

  it("As a flexible traveler, I can select multiple venues and restore them after refresh", () => {
    cy.get('input[name="venues[]"][value="galleria"]').check();
    cy.get('input[name="venues[]"][value="batumi"]').check();
    cy.location("search").should("include", "venue=galleria%2Cbatumi");
    cy.reload();
    cy.get('input[name="venues[]"][value="galleria"]').should("be.checked");
    cy.get('input[name="venues[]"][value="batumi"]').should("be.checked");
  });

  it("As a viewer browsing choices, I can use browser history and open an available screening", () => {
    cy.get('input[name="bands[]"][value="evening"]').check();
    cy.get("#sessions-sort").select("title_asc");
    cy.go("back");
    cy.get('input[name="bands[]"][value="evening"]').should("be.checked");
    cy.get("#sessions-sort").should("have.value", "time_asc");
    cy.get(".session-showtime:not(.is-sold-out)")
      .first()
      .should("have.attr", "href", "/pages/seat-selection.html?sessionId=705");
    cy.get(".session-showtime.is-sold-out")
      .should("have.attr", "aria-disabled", "true")
      .and("not.have.attr", "href");
  });
});
