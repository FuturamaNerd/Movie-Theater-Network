import {
  buildSessionsUrlQuery,
  buildSessionsQuery,
  initializeSessionsPage,
  readSessionFilters,
} from "../../src/interactivity/sessions-page.js";

const filterOptions = {
  venues: [
    {
      id: 1,
      slug: "galleria",
      name: "Galleria Tbilisi",
      city: "Tbilisi",
      formats: [
        { id: 2, slug: "max", name: "MAX", priceUplift: 6 },
        { id: 3, slug: "atmos", name: "ATMOS", priceUplift: 4 },
      ],
    },
    {
      id: 2,
      slug: "vake",
      name: "Vake Park",
      city: "Tbilisi",
      formats: [{ id: 1, slug: "standard", name: "Standard", priceUplift: 0 }],
    },
  ],
  formats: [
    { id: 1, slug: "standard", name: "Standard", priceUplift: 0 },
    { id: 2, slug: "max", name: "MAX", priceUplift: 6 },
    { id: 3, slug: "atmos", name: "ATMOS", priceUplift: 4 },
  ],
  languages: [
    { id: 1, slug: "georgian-dub", name: "Georgian Dub", code: "GEO" },
  ],
  timeBands: [
    { id: "morning", label: "Morning (before 12:00)" },
    { id: "afternoon", label: "Afternoon (12:00 - 18:00)" },
    { id: "evening", label: "Evening (after 18:00)" },
  ],
  sorts: [
    { id: "time_asc", label: "Showtime: earliest first" },
    { id: "price_asc", label: "Price: low to high" },
    { id: "title_asc", label: "Title: A-Z" },
  ],
};

const movie = {
  id: 1,
  slug: "sample-movie",
  title: "Sample Movie",
  kind: "film",
  runtimeMinutes: 100,
  posterUrl: "https://example.com/poster.jpg",
  backdropUrl: "https://example.com/backdrop.jpg",
  releaseDate: "2026-10-01",
  isComingSoon: false,
  isFeatured: true,
  fromPrice: 14,
  ageRating: { code: "12+", minAge: 12, description: "Age 12 and over." },
  genres: [],
  formats: [],
};

const venue = { id: 1, slug: "galleria", name: "Galleria Tbilisi", city: "Tbilisi" };
const session = {
  id: 7,
  startsAt: "2026-10-11T10:00:00+00:00",
  date: "2026-10-11",
  time: "10:00",
  timeBand: "morning",
  price: 14,
  seatsLeft: 41,
  isSoldOut: false,
  hall: { id: 3, name: "A", venue },
  venue,
  format: { id: 1, slug: "standard", name: "Standard", priceUplift: 0 },
  language: { id: 1, slug: "georgian-dub", name: "Georgian Dub", code: "GEO" },
  movie,
};

function sessionsResponse(overrides = {}) {
  return {
    data: [{ movie, sessions: [session, { ...session, id: 8, time: "14:00", isSoldOut: true, seatsLeft: 0 }] }],
    meta: {
      currentPage: 1,
      lastPage: 3,
      perPage: 10,
      totalSessions: 27,
      totalMovies: 24,
      date: "2026-10-11",
      ...overrides,
    },
  };
}

function createPage() {
  document.body.innerHTML = `
    <aside class="sessions-filters">
      <input id="sessions-date" type="date" />
      <div id="sessions-date-strip"></div>
      <div id="session-filter-groups"></div>
      <p id="active-filter-count"></p>
    </aside>
    <header>
      <div class="header-search">
        <input id="movie" type="search" />
        <button type="submit">Search</button>
      </div>
    </header>
    <main id="sessions-page">
      <button id="clear-session-filters" type="button">Clear all</button>
      <select id="sessions-sort"></select>
      <p id="sessions-count"></p>
      <p id="sessions-status" role="status" hidden></p>
      <div id="session-movie-list"></div>
      <nav id="sessions-pagination" hidden></nav>
    </main>
  `;

  window.fetch = jest.fn((url) => {
    if (String(url).endsWith("/filter-options")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: filterOptions }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(sessionsResponse()),
    });
  });
}

describe("sessions page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/pages/sessions.html");
    createPage();
  });

  afterEach(() => {
    delete window.fetch;
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
    jest.restoreAllMocks();
  });

  it("maps repeated array filters and pagination directly to URL parameters", () => {
    const filters = readSessionFilters(
      "?venues%5B%5D=galleria&venues%5B%5D=vake&date=2026-11-14&formats%5B%5D=max&page=2",
    );

    expect(filters).toMatchObject({
      venues: ["galleria", "vake"],
      date: "2026-11-14",
      formats: ["max"],
      page: 2,
      sort: "time_asc",
    });
    const query = new URLSearchParams(buildSessionsQuery(filters));
    expect(query.getAll("venues[]")).toEqual(["galleria", "vake"]);
    expect(query.get("date")).toBe("2026-11-14");
    expect(query.getAll("formats[]")).toEqual(["max"]);
    expect(query.get("page")).toBe("2");
  });

  it("renders grouped film showtimes, sold-out cards, session count and film pagination", async () => {
    await initializeSessionsPage(document);

    expect(
      document
        .querySelector("#sessions-date-strip")
        .closest(".sessions-filters"),
    ).not.toBeNull();
    expect(document.querySelectorAll(".session-movie")).toHaveLength(1);
    expect(document.querySelectorAll(".session-showtime")).toHaveLength(2);
    expect(document.querySelector(".session-movie h2").textContent).toBe(
      "Sample Movie",
    );
    expect(document.querySelector(".session-showtime.is-sold-out")).not.toBeNull();
    expect(document.querySelector("#sessions-count").textContent).toBe(
      "Showing 27 sessions",
    );
    expect(document.querySelector("#sessions-pagination").hidden).toBe(false);
    expect(document.querySelector("#sessions-pagination").textContent).toContain(
      "Page 1 of 3",
    );
    expect(document.querySelector(".session-showtime:not(.is-sold-out)").tagName).toBe(
      "A",
    );
    expect(document.querySelector(".session-showtime-price").textContent).toBe(
      "from ₾14",
    );
    expect(
      document.querySelector(".session-showtime.is-sold-out").hasAttribute("href"),
    ).toBe(false);
  });

  it("narrows formats to selected venue capabilities and resets pagination", async () => {
    window.history.replaceState(
      {},
      "",
      "/pages/sessions.html?formats%5B%5D=atmos&page=4",
    );
    await initializeSessionsPage(document);
    expect(
      document.querySelector('input[name="formats[]"][value="atmos"]').checked,
    ).toBe(true);

    const venueCheckbox = document.querySelector(
      'input[name="venues[]"][value="vake"]',
    );
    venueCheckbox.checked = true;
    venueCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("venue")).toBe("vake");
    expect(params.get("format")).toBeNull();
    expect(params.get("page")).toBe("1");
    expect(
      document.querySelector('input[name="formats[]"][value="atmos"]'),
    ).toBeNull();
    expect(
      document.querySelector('input[name="formats[]"][value="standard"]'),
    ).not.toBeNull();
  });

  it("resets to page one when the date or sort changes", async () => {
    window.history.replaceState({}, "", "/pages/sessions.html?page=5");
    await initializeSessionsPage(document);

    const sort = document.querySelector("#sessions-sort");
    sort.value = "price_asc";
    sort.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(new URLSearchParams(location.search).get("page")).toBe("1");
    expect(new URLSearchParams(location.search).get("sort")).toBe("price_asc");

    const date = document.querySelector("#sessions-date");
    date.value = "2026-11-14";
    date.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(new URLSearchParams(location.search).get("page")).toBe("1");
    expect(new URLSearchParams(location.search).get("date")).toBe("2026-11-14");
  });

  it("requests subsequent pages by film page number", async () => {
    await initializeSessionsPage(document);
    document
      .querySelector('#sessions-pagination button[aria-label="Page 2"]')
      .click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(new URLSearchParams(location.search).get("page")).toBe("2");
    expect(
      window.fetch.mock.calls.some(([url]) =>
        String(url).includes("page=2"),
      ),
    ).toBe(true);
  });

  it("updates the search query and clears all filters while resetting the page", async () => {
    window.history.replaceState(
      {},
      "",
      "/pages/sessions.html?venues%5B%5D=galleria&formats%5B%5D=max&date=2026-11-14&page=3",
    );
    await initializeSessionsPage(document);

    const search = document.querySelector("#movie");
    search.value = "Sample Movie";
    document
      .querySelector(".header-search button")
      .click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    let params = new URLSearchParams(location.search);
    expect(params.get("search")).toBe("Sample Movie");
    expect(params.get("page")).toBe("1");
    expect(params.get("venue")).toBe("galleria");
    expect(params.get("format")).toBe("max");

    document.querySelector("#clear-session-filters").click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    params = new URLSearchParams(location.search);
    expect(params.get("venue")).toBeNull();
    expect(params.get("format")).toBeNull();
    expect(params.get("search")).toBeNull();
    expect(params.get("sort")).toBe("time_asc");
    expect(params.get("page")).toBe("1");
    expect(params.get("date")).toBe("2026-11-14");
    expect(document.querySelector("#active-filter-count").textContent).toBe(
      "0 filters active",
    );
  });

  it("supports the documented comma-separated URL state while keeping API arrays", () => {
    const filters = readSessionFilters(
      "?venue=galleria,vake&date=2026-11-14&format=max&language=georgian-dub&band=evening&page=2",
    );
    expect(filters).toMatchObject({
      venues: ["galleria", "vake"],
      formats: ["max"],
      languages: ["georgian-dub"],
      bands: ["evening"],
      date: "2026-11-14",
      page: 2,
    });
    const pageQuery = new URLSearchParams(buildSessionsUrlQuery(filters));
    expect(pageQuery.get("venue")).toBe("galleria,vake");
    expect(pageQuery.get("format")).toBe("max");
    const apiQuery = new URLSearchParams(buildSessionsQuery(filters));
    expect(apiQuery.getAll("venues[]")).toEqual(["galleria", "vake"]);
    expect(apiQuery.getAll("formats[]")).toEqual(["max"]);
  });

  it("shows the next seven dates and selects the current date", async () => {
    await initializeSessionsPage(document);
    const dateButtons = [...document.querySelectorAll(".session-date-button")];
    expect(dateButtons).toHaveLength(7);
    expect(dateButtons[0].dataset.date).toBe(
      new Date().toLocaleDateString("en-CA"),
    );
    expect(dateButtons.filter((button) => button.getAttribute("aria-pressed") === "true"))
      .toHaveLength(1);
    expect(document.querySelector("#sessions-date").max).not.toBe("");
  });

  it("renders the exact no-results message for an empty response", async () => {
    window.fetch = jest.fn((url) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            String(url).endsWith("/filter-options")
              ? { data: filterOptions }
              : { data: [], meta: { currentPage: 1, lastPage: 1, totalSessions: 0, totalMovies: 0 } },
          ),
      }),
    );
    await initializeSessionsPage(document);
    expect(document.querySelector("#sessions-count").textContent).toBe(
      "No sessions found",
    );
  });

  it("restores filter controls and reloads results on browser history navigation", async () => {
    await initializeSessionsPage(document);
    window.history.pushState(
      {},
      "",
      "/pages/sessions.html?venues%5B%5D=galleria&sort=title_asc&page=2",
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(
      document.querySelector('input[name="venues[]"][value="galleria"]').checked,
    ).toBe(true);
    expect(document.querySelector("#sessions-sort").value).toBe("title_asc");
    expect(
      window.fetch.mock.calls.some(([url]) =>
        String(url).includes("page=2"),
      ),
    ).toBe(true);
  });
});
