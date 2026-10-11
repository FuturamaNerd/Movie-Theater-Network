import { saveAuthSession } from "../../src/Auth/auth-session.js";
import { createMovieCard } from "../../src/render-pages/movie-sections.js";
import { initializeProtectedActions } from "../../src/render-pages/protected-actions.js";

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

function signIn() {
  saveAuthSession(
    {
      token: "test-token",
      user: {
        id: 1,
        username: "jane",
        email: "jane@example.test",
        fullName: "Jane Example",
        profileComplete: true,
      },
    },
    window.sessionStorage,
  );
  document.dispatchEvent(new Event("auth:login"));
}

describe("protected page actions", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    document.documentElement.removeAttribute(
      "data-protected-actions-initialized",
    );
    document.body.innerHTML = `
      <button class="login-button" type="button">Log in</button>
      <main></main>
    `;
    initializeProtectedActions(document);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    delete window.fetch;
    document.body.innerHTML = "";
    document.documentElement.removeAttribute(
      "data-protected-actions-initialized",
    );
    jest.restoreAllMocks();
  });

  it("opens login from Select Seats and resumes seat selection after login", () => {
    const loginButton = document.querySelector(".login-button");
    const action = document.createElement("button");
    action.type = "button";
    action.dataset.requiresAuth = "true";
    action.textContent = "Select Seats";
    document.querySelector("main").append(action);
    const loginOpened = jest.fn();
    const selectionStarted = jest.fn();
    loginButton.addEventListener("click", loginOpened);
    action.addEventListener("click", selectionStarted);

    action.click();

    expect(loginOpened).toHaveBeenCalledTimes(1);
    expect(selectionStarted).not.toHaveBeenCalled();

    signIn();

    expect(selectionStarted).toHaveBeenCalledTimes(1);
  });

  it("opens login from My Tickets when the visitor is signed out", () => {
    const link = document.createElement("a");
    link.href = "/tickets";
    link.dataset.requiresAuth = "true";
    link.textContent = "My Tickets";
    document.querySelector("main").append(link);
    const loginOpened = jest.fn();
    const navigationAttempted = jest.fn((event) => event.preventDefault());
    document.querySelector(".login-button").addEventListener("click", loginOpened);
    link.addEventListener("click", navigationAttempted);

    link.click();

    expect(loginOpened).toHaveBeenCalledTimes(1);
    expect(navigationAttempted).not.toHaveBeenCalled();
  });

  it("opens login from Notify Me and submits the notification after login", async () => {
    window.fetch = jest.fn().mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ data: { movieId: movie.id, subscribed: true } }),
    });
    const card = createMovieCard(movie, false);
    document.querySelector("main").append(card);
    const loginOpened = jest.fn();
    document.querySelector(".login-button").addEventListener("click", loginOpened);

    card.querySelector(".movie-card-notify").click();

    expect(loginOpened).toHaveBeenCalledTimes(1);
    expect(window.fetch).not.toHaveBeenCalled();

    signIn();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(window.fetch.mock.calls[0][0]).toContain(
      `/movies/${movie.slug}/notify`,
    );
  });

  it("opens login before opening a protected profile action", () => {
    const openProfile = document.createElement("button");
    openProfile.type = "button";
    openProfile.dataset.requiresAuth = "true";
    openProfile.textContent = "Open profile";
    document.querySelector("main").append(openProfile);
    const loginOpened = jest.fn();
    const profileOpened = jest.fn();
    document.querySelector(".login-button").addEventListener("click", loginOpened);
    openProfile.addEventListener("click", profileOpened);

    openProfile.click();

    expect(loginOpened).toHaveBeenCalledTimes(1);
    expect(profileOpened).not.toHaveBeenCalled();
  });

  it("opens login before placing an order in the lobby", () => {
    const placeOrder = document.createElement("button");
    placeOrder.type = "button";
    placeOrder.dataset.requiresAuth = "true";
    placeOrder.textContent = "Place lobby order";
    document.querySelector("main").append(placeOrder);
    const loginOpened = jest.fn();
    const orderPlaced = jest.fn();
    document.querySelector(".login-button").addEventListener("click", loginOpened);
    placeOrder.addEventListener("click", orderPlaced);

    placeOrder.click();

    expect(loginOpened).toHaveBeenCalledTimes(1);
    expect(orderPlaced).not.toHaveBeenCalled();
  });

  it("opens login for any other restricted action", () => {
    const action = document.createElement("button");
    action.type = "button";
    action.dataset.requiresAuth = "true";
    action.textContent = "Restricted action";
    document.querySelector("main").append(action);
    const loginOpened = jest.fn();
    const actionPerformed = jest.fn();
    document.querySelector(".login-button").addEventListener("click", loginOpened);
    action.addEventListener("click", actionPerformed);

    action.click();

    expect(loginOpened).toHaveBeenCalledTimes(1);
    expect(actionPerformed).not.toHaveBeenCalled();
  });

  it("replays the original action without navigating away from its page", () => {
    const initialPath = window.location.pathname;
    const link = document.createElement("a");
    link.href = "/protected-destination";
    link.dataset.requiresAuth = "true";
    document.querySelector("main").append(link);
    const navigationAttempted = jest.fn((event) => event.preventDefault());
    link.addEventListener("click", navigationAttempted);

    link.click();
    expect(navigationAttempted).not.toHaveBeenCalled();

    signIn();

    expect(navigationAttempted).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe(initialPath);
  });
});
