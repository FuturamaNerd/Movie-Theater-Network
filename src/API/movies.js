import {
  getAuthSession,
  handleUnauthorizedResponse,
} from "../Auth/auth-session.js";

const FEATURED_MOVIES_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/movies/featured";

const MOVIES_NOW_PLAYING_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/movies/now-playing";

const MOVIES_COMING_SOON_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/movies/coming-soon";
const MOVIE_NOTIFICATIONS_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/movies";

export class MovieNotificationError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "MovieNotificationError";
    this.status = status;
  }
}

// The movie endpoints may return either a raw list or the standard { data } envelope.
export async function fetchFeaturedMovies() {
  const response = await fetch(FEATURED_MOVIES_ENDPOINT);
  handleUnauthorizedResponse(response);

  if (!response.ok) {
    throw new Error(`Failed to fetch featured movies: ${response.status}`);
  }

  const payload = await response.json();
  const movies = Array.isArray(payload) ? payload : payload.data;

  if (!Array.isArray(movies)) {
    throw new TypeError(
      "The featured movies API response must contain a data array",
    );
  }

  return movies;
}

export const fetchMovies = fetchFeaturedMovies;

/** @returns {Promise<import("../models/movie-interfaces").MovieData[]>} */
export async function fetchNowPlayingMovies() {
  const response = await fetch(MOVIES_NOW_PLAYING_ENDPOINT);
  handleUnauthorizedResponse(response);

  if (!response.ok) {
    throw new Error(`Failed to fetch now playing movies: ${response.status}`);
  }

  const payload = await response.json();
  const movies = Array.isArray(payload) ? payload : payload.data;

  if (!Array.isArray(movies)) {
    throw new TypeError(
      "The now playing movies API response must contain a data array",
    );
  }

  return movies;
}
export async function fetchComingSoonMovies() {
  const response = await fetch(MOVIES_COMING_SOON_ENDPOINT);
  handleUnauthorizedResponse(response);

  if (!response.ok) {
    throw new Error(`Failed to fetch coming soon movies: ${response.status}`);
  }

  const payload = await response.json();
  const movies = Array.isArray(payload) ? payload : payload.data;

  if (!Array.isArray(movies)) {
    throw new TypeError(
      "The coming soon movies API response must contain a data array",
    );
  }

  return movies;
}

/**
 * @param {string} movieSlug
 * @param {Document} [doc]
 * @returns {Promise<import("../models/movie-interfaces").MovieNotificationResponse["data"]>}
 */
export async function notifyWhenMovieOpens(movieSlug, doc = document) {
  if (!movieSlug) {
    throw new TypeError("A movie slug is required to request notifications");
  }

  const session = getAuthSession(doc.defaultView.sessionStorage);
  if (!session) {
    throw new Error("An authenticated session is required for notifications");
  }

  const response = await doc.defaultView.fetch(
    `${MOVIE_NOTIFICATIONS_ENDPOINT}/${encodeURIComponent(movieSlug)}/notify`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
    },
  );
  handleUnauthorizedResponse(response, doc);

  if (response.status === 401) {
    throw new MovieNotificationError("Authentication is required.", 401);
  }
  if (response.status === 404) {
    throw new MovieNotificationError("Movie not found.", 404);
  }
  if (response.status !== 201) {
    throw new MovieNotificationError(
      `Failed to subscribe for movie notifications: ${response.status}`,
      response.status,
    );
  }

  const payload = await response.json();
  if (
    typeof payload?.data?.movieId !== "number" ||
    payload.data.subscribed !== true
  ) {
    throw new TypeError("Movie notification response was invalid");
  }
  return payload.data;
}
