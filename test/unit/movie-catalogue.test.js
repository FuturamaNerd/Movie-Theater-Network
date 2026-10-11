import {
  initializeMovieCatalogue,
} from "../../src/render-pages/movie-catalogue.js";

const movies = [{
  id: 1,
  slug: "quiet-galaxy",
  title: "Quiet Galaxy",
  kind: "film",
  runtimeMinutes: 112,
  posterUrl: "/poster.jpg",
  backdropUrl: "/backdrop.jpg",
  releaseDate: "2026-10-01",
  isComingSoon: true,
  isFeatured: false,
  fromPrice: 12,
  ageRating: { code: "12+", minAge: 12, description: "Age 12+" },
  genres: [{ id: 1, slug: "adventure", name: "Adventure" }],
  formats: [],
}];

describe("full movie catalogue page", () => {
  afterEach(() => {
    delete window.fetch;
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
    jest.restoreAllMocks();
  });

  it.each([
    ["now-playing", "Now Playing", "/movies/now-playing", ".now-playing-card"],
    ["coming-soon", "Coming Soon", "/movies/coming-soon", ".coming-soon-card"],
  ])("renders the %s catalogue", async (type, title, endpoint, cardSelector) => {
    window.history.replaceState({}, "", `/pages/movies.html?type=${type}`);
    document.body.innerHTML = `
      <main id="movie-catalogue-page">
        <h1 id="movie-catalogue-title"></h1>
        <p id="movie-catalogue-status" hidden></p>
        <div id="movie-catalogue-list"></div>
      </main>
    `;
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: movies }),
    });

    await initializeMovieCatalogue(document);

    expect(document.querySelector("h1").textContent).toBe(title);
    expect(document.querySelector(cardSelector)).not.toBeNull();
    expect(document.querySelector(".movie-card-title").textContent).toBe(
      "Quiet Galaxy",
    );
    expect(String(window.fetch.mock.calls[0][0])).toContain(endpoint);
  });
});
