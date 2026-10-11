import { saveAuthSession } from "../../src/Auth/auth-session.js";
import { initializeMovieDetailsPage } from "../../src/render-pages/movie-details.js";

const movie = {
  id: 23,
  slug: "buddy",
  title: "Buddy",
  kind: "film",
  runtimeMinutes: 95,
  posterUrl: "/buddy-poster.jpg",
  backdropUrl: "/buddy-backdrop.jpg",
  releaseDate: "2026-08-27",
  isComingSoon: false,
  isFeatured: false,
  fromPrice: 12,
  ageRating: {
    code: "16+",
    minAge: 16,
    description: "Restricted to viewers aged 16 and over.",
  },
  genres: [{ id: 4, slug: "horror", name: "Horror" }],
  formats: [{ id: 4, slug: "panorama", name: "PANORAMA", priceUplift: 5 }],
  synopsis: "A surreal adventure.",
  director: "Casper Kelly",
  cast: "Keegan-Michael Key, Cristin Milioti",
  availableDates: [
    "2026-10-11",
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
    "2026-10-18",
  ],
};

const venue = {
  id: 3,
  slug: "rustaveli",
  name: "Rustaveli Palace",
  city: "Tbilisi",
};

const showtimeGroups = [
  {
    venue,
    sessions: [
      {
        id: 1471,
        startsAt: "2026-10-11T12:00:00+00:00",
        date: "2026-10-11",
        time: "12:00",
        timeBand: "afternoon",
        price: 17,
        seatsLeft: 77,
        isSoldOut: false,
        hall: { id: 10, name: "B" },
        venue,
        format: { id: 4, slug: "panorama", name: "PANORAMA", priceUplift: 5 },
        language: {
          id: 3,
          slug: "original-subtitles",
          name: "Original with Subtitles",
          code: "ENG",
        },
      },
    ],
  },
];

function createDetailsPage() {
  document.body.innerHTML = `
    <main id="movie-details-page">
      <p id="movie-details-status" role="status" hidden></p>
      <section id="movie-details-hero" hidden>
        <img id="movie-details-backdrop" />
        <img id="movie-details-poster" />
        <p class="movie-details-kicker"></p>
        <h1 id="movie-details-title"></h1>
        <p id="movie-details-synopsis"></p>
        <span id="movie-details-rating"></span>
        <span id="movie-details-runtime"></span>
        <span id="movie-details-formats"></span>
      </section>
      <section id="movie-details-content" hidden>
        <div id="movie-details-dates"></div>
        <p id="movie-details-age-error" role="alert" hidden></p>
        <div id="movie-details-venue-list"></div>
        <p id="movie-details-empty" hidden></p>
        <p id="movie-details-director"></p>
        <p id="movie-details-cast"></p>
        <p id="movie-details-genres"></p>
        <p id="movie-details-release"></p>
        <p id="movie-details-duration"></p>
        <p id="movie-details-rating-copy"></p>
      </section>
    </main>
  `;
  window.history.replaceState({}, "", "/pages/movie-details.html?movie=buddy");
  window.sessionStorage.clear();
  window.fetch = jest.fn((url) => {
    const isMovie = String(url).endsWith("/movies/buddy");
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: isMovie ? movie : showtimeGroups,
        }),
    });
  });
}

describe("film details page", () => {
  beforeEach(() => {
    createDetailsPage();
  });

  afterEach(() => {
    delete window.fetch;
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("loads and renders the movie detail fields", async () => {
    await initializeMovieDetailsPage(document, { today: new Date(2026, 9, 11) });

    expect(window.fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.kinoxii.redberryinternship.ge/api/movies/buddy",
    );
    expect(document.querySelector("#movie-details-title").textContent).toBe(
      "Buddy",
    );
    expect(document.querySelector("#movie-details-backdrop").src).toContain(
      "/buddy-backdrop.jpg",
    );
    expect(document.querySelector("#movie-details-poster").alt).toBe(
      "Poster for Buddy",
    );
    expect(document.querySelector("#movie-details-synopsis").textContent).toBe(
      "A surreal adventure.",
    );
    expect(document.querySelector("#movie-details-rating-copy").textContent).toBe(
      movie.ageRating.description,
    );
    expect(document.querySelector("#movie-details-rating").title).toBe(
      movie.ageRating.description,
    );
    expect(document.querySelector("#movie-details-runtime").textContent).toBe(
      "95 min",
    );
    expect(document.querySelector("#movie-details-genres").textContent).toBe(
      "Horror",
    );
    expect(document.querySelector("#movie-details-director").textContent).toBe(
      "Casper Kelly",
    );
    expect(document.querySelector("#movie-details-cast").textContent).toContain(
      "Cristin Milioti",
    );
    expect(document.querySelector("#movie-details-formats").textContent).toBe(
      "PANORAMA",
    );
  });

  it("shows seven dates and groups sessions with all documented showtime details", async () => {
    await initializeMovieDetailsPage(document, { today: new Date(2026, 9, 11) });

    expect(document.querySelectorAll(".movie-details-date-option")).toHaveLength(7);
    expect(
      document.querySelectorAll(".movie-details-date-option:not(:disabled)"),
    ).toHaveLength(7);
    expect(document.querySelector(".movie-details-venue h3").textContent).toBe(
      "Rustaveli Palace",
    );
    expect(document.querySelector(".movie-details-showtime").textContent).toContain(
      "12:00",
    );
    expect(document.querySelector(".movie-details-showtime").textContent).toContain(
      "PANORAMA",
    );
    expect(document.querySelector(".movie-details-showtime").textContent).toContain(
      "Hall B",
    );
    expect(document.querySelector(".movie-details-showtime").textContent).toContain(
      "ENG",
    );
    expect(document.querySelector(".movie-details-showtime").textContent).toContain(
      "₾17",
    );
    expect(document.querySelector(".movie-details-showtime").textContent).toContain(
      "77 seats",
    );
  });

  it("requests the selected available date and displays empty-date feedback", async () => {
    await initializeMovieDetailsPage(document, { today: new Date(2026, 9, 11) });
    window.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });

    document.querySelector('[data-date="2026-10-12"]').click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(window.fetch).toHaveBeenLastCalledWith(
      "https://api.kinoxii.redberryinternship.ge/api/movies/buddy/sessions?date=2026-10-12",
    );
    expect(document.querySelector("#movie-details-empty").hidden).toBe(false);
    expect(document.querySelector("#movie-details-venue-list").children).toHaveLength(
      0,
    );
  });

  it.each([
    [16, 15],
    [18, 17],
  ])(
    "disables a %i+ showtime for an account aged %i",
    async (minimumAge, userAge) => {
    saveAuthSession(
      {
        token: "teen-token",
        user: {
          id: 9,
          username: "teen",
          email: "teen@example.test",
          age: userAge,
          profileComplete: true,
        },
      },
      window.sessionStorage,
    );
    const restrictedMovie = {
      ...movie,
      ageRating: {
        ...movie.ageRating,
        code: `${minimumAge}+`,
        minAge: minimumAge,
      },
    };
    window.fetch = jest.fn((url) => {
      const isMe = String(url).endsWith("/api/me");
      const isMovie = String(url).endsWith("/movies/buddy");
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: isMe
            ? {
                id: 9,
                username: "teen",
                email: "teen@example.test",
                age: userAge,
                profileComplete: true,
              }
            : isMovie
              ? restrictedMovie
              : showtimeGroups,
        }),
      });
    });

    await initializeMovieDetailsPage(document, { today: new Date(2026, 9, 11) });

    const showtime = document.querySelector(".movie-details-showtime");
    expect(showtime.tagName).toBe("BUTTON");
    expect(showtime.getAttribute("aria-disabled")).toBe("true");
    expect(showtime.hasAttribute("href")).toBe(false);
    expect(document.querySelector("#movie-details-age-error").textContent).toBe(
      `This film is rated ${minimumAge}+. You cannot buy tickets for it with this account.`,
    );
    },
  );

  it("preserves a selectable showtime's session ID for seat selection", async () => {
    await initializeMovieDetailsPage(document, { today: new Date(2026, 9, 11) });
    const showtime = document.querySelector(".movie-details-showtime");

    expect(showtime.tagName).toBe("A");
    expect(showtime.getAttribute("href")).toBe(
      "/pages/seat-selection.html?sessionId=1471",
    );
    expect(showtime.dataset.requiresAuth).toBe("true");
  });
});
