import {
  getRecentlyViewedMovies,
  initializeRecentlyViewed,
  recordRecentlyViewedMovie,
} from "../../src/interactivity/recently-viewed.js";

const movie = (slug, title = slug) => ({
  id: Number(slug.replace(/\D/g, "")) || 1,
  slug,
  title,
  kind: "film",
  runtimeMinutes: 90,
  posterUrl: `/${slug}.jpg`,
  backdropUrl: `/${slug}-backdrop.jpg`,
  releaseDate: "2026-12-01",
  isComingSoon: false,
  isFeatured: false,
  fromPrice: 10,
  ageRating: { code: "12+", minAge: 12, description: "Ages 12 and over." },
  genres: [{ id: 1, slug: "comedy", name: "Comedy" }],
  formats: [],
  synopsis: "A movie.",
  director: "A director",
  cast: "An actor",
  availableDates: [],
});

describe("recently viewed movies", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    document.body.innerHTML = "";
  });

  it("stores the latest eight distinct movies in most-recent-first order", () => {
    for (let index = 1; index <= 9; index += 1) {
      recordRecentlyViewedMovie(
        movie(`film-${index}`),
        window.localStorage,
        new Date(`2026-10-${String(index).padStart(2, "0")}T12:00:00Z`),
      );
    }
    recordRecentlyViewedMovie(
      movie("film-2", "Film Two"),
      window.localStorage,
      new Date("2026-10-10T12:00:00Z"),
    );

    const recentlyViewed = getRecentlyViewedMovies(window.localStorage);
    expect(recentlyViewed).toHaveLength(8);
    expect(recentlyViewed[0].title).toBe("Film Two");
    expect(recentlyViewed.some(({ slug }) => slug === "film-1")).toBe(false);
    expect(recentlyViewed.filter(({ slug }) => slug === "film-2")).toHaveLength(1);
  });

  it("renders recent movies as links to their detail pages", () => {
    recordRecentlyViewedMovie(movie("buddy", "Buddy"), window.localStorage);
    document.body.innerHTML = `
      <section id="recently-viewed-section" hidden>
        <div class="recently-viewed-rail"></div>
        <p class="recently-viewed-status" role="status" hidden></p>
      </section>
    `;

    initializeRecentlyViewed(document);

    const section = document.querySelector("#recently-viewed-section");
    expect(section.hidden).toBe(false);
    expect(section.querySelector(".movie-card-title").textContent).toBe("Buddy");
    expect(section.querySelector("a").getAttribute("href")).toBe(
      "/pages/movie-details.html?movie=buddy",
    );
  });
});
