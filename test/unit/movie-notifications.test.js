import { saveAuthSession } from "../../src/Auth/auth-session.js";
import { notifyWhenMovieOpens } from "../../src/API/movies.js";
import { createMovieCard } from "../../src/render-pages/movie-sections.js";

const movie = {
  id: 4,
  slug: "buddy-1514026",
  title: "Buddy",
  kind: "film",
  runtimeMinutes: 90,
  posterUrl: "/buddy.jpg",
  backdropUrl: "/buddy-backdrop.jpg",
  releaseDate: "2026-12-01",
  isComingSoon: true,
  isFeatured: false,
  fromPrice: 10,
  ageRating: { code: "12+", minAge: 12, description: "Ages 12 and over." },
  genres: [{ id: 1, slug: "comedy", name: "Comedy" }],
  formats: [],
};

function authenticate(token = "test-token") {
  saveAuthSession(
    { user: { id: 1 }, token },
    window.sessionStorage,
  );
}

describe("movie notifications", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    delete window.fetch;
    jest.restoreAllMocks();
  });

  it("posts a subscription and validates the API response", async () => {
    authenticate();
    window.fetch = jest.fn().mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ data: { movieId: 4, subscribed: true } }),
    });

    await expect(
      notifyWhenMovieOpens(movie.slug, document),
    ).resolves.toEqual({ movieId: 4, subscribed: true });
    expect(window.fetch).toHaveBeenCalledWith(
      "https://api.kinoxii.redberryinternship.ge/api/movies/buddy-1514026/notify",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer test-token",
        },
      },
    );
  });

  it("renders a Notify me action on each coming-soon card", async () => {
    authenticate();
    window.fetch = jest.fn().mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ data: { movieId: 4, subscribed: true } }),
    });
    const card = createMovieCard(movie, false);
    document.body.append(card);

    const button = card.querySelector(".movie-card-notify");
    expect(button.dataset.requiresAuth).toBe("true");
    expect(button.querySelector("img").src).toContain("/styles/SVG/notify.svg");
    button.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(card.querySelector(".movie-notify-status").textContent).toBe(
      "You'll be notified when this title opens.",
    );
  });

  it("replays a notification request after an expired session is renewed", async () => {
    authenticate();
    window.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ message: "Unauthenticated." }),
      })
      .mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({ data: { movieId: 4, subscribed: true } }),
      });
    const logError = jest.spyOn(console, "error").mockImplementation(() => {});
    const unauthorized = jest.fn();
    document.addEventListener("auth:unauthorized", unauthorized);
    const card = createMovieCard(movie, false);
    document.body.append(card);

    card.querySelector(".movie-card-notify").click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(unauthorized).toHaveBeenCalledTimes(1);

    authenticate("renewed-token");
    document.dispatchEvent(new Event("auth:login"));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(window.fetch).toHaveBeenCalledTimes(2);
    expect(window.fetch.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer renewed-token",
    );
    expect(card.querySelector(".movie-notify-status").textContent).toBe(
      "You'll be notified when this title opens.",
    );
    document.removeEventListener("auth:unauthorized", unauthorized);
    logError.mockRestore();
  });
});
