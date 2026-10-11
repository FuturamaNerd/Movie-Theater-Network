const RECENTLY_VIEWED_KEY = "recently-viewed-movies";
const MAX_RECENTLY_VIEWED = 8;

/** @typedef {import("../models/movie-interfaces").MovieData} MovieData */
/** @typedef {import("../models/movie-interfaces").MovieDetailData} MovieDetailData */
/** @typedef {import("../models/movie-interfaces").RecentlyViewedMovie} RecentlyViewedMovie */

/**
 * @param {unknown} value
 * @returns {value is MovieData}
 */
function isMovieData(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "number" &&
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    typeof value.kind === "string" &&
    typeof value.runtimeMinutes === "number" &&
    typeof value.posterUrl === "string" &&
    typeof value.backdropUrl === "string" &&
    typeof value.releaseDate === "string" &&
    typeof value.isComingSoon === "boolean" &&
    (value.isNotified === undefined || typeof value.isNotified === "boolean") &&
    typeof value.isFeatured === "boolean" &&
    typeof value.fromPrice === "number" &&
    typeof value.ageRating?.code === "string" &&
    typeof value.ageRating?.minAge === "number" &&
    typeof value.ageRating?.description === "string" &&
    Array.isArray(value.genres) &&
    value.genres.every(
      (genre) =>
        typeof genre?.id === "number" &&
        typeof genre.slug === "string" &&
        typeof genre.name === "string",
    ) &&
    Array.isArray(value.formats) &&
    value.formats.every(
      (format) =>
        typeof format?.id === "number" &&
        typeof format.slug === "string" &&
        typeof format.name === "string" &&
        typeof format.priceUplift === "number",
    )
  );
}

/**
 * @param {unknown} value
 * @returns {value is RecentlyViewedMovie}
 */
function isRecentlyViewedMovie(value) {
  return (
    isMovieData(value) &&
    typeof value.viewedAt === "string" &&
    Number.isFinite(Date.parse(value.viewedAt))
  );
}

/**
 * @param {Storage} [storage]
 * @returns {RecentlyViewedMovie[]}
 */
export function getRecentlyViewedMovies(storage = window.localStorage) {
  const savedMovies = storage.getItem(RECENTLY_VIEWED_KEY);
  if (savedMovies === null) return [];

  const movies = JSON.parse(savedMovies);
  if (!Array.isArray(movies) || !movies.every(isRecentlyViewedMovie)) {
    throw new TypeError("Recently viewed movie data is invalid");
  }
  return movies;
}

/**
 * @param {MovieDetailData} movie
 * @param {Storage} [storage]
 * @param {Date} [viewedAt]
 * @returns {RecentlyViewedMovie[]}
 */
export function recordRecentlyViewedMovie(
  movie,
  storage = window.localStorage,
  viewedAt = new Date(),
) {
  if (!isMovieData(movie)) {
    throw new TypeError("Movie details are invalid for recently viewed history");
  }

  const recentMovie = { ...movie, viewedAt: viewedAt.toISOString() };
  const movies = getRecentlyViewedMovies(storage).filter(
    (savedMovie) => savedMovie.slug !== movie.slug,
  );
  movies.unshift(recentMovie);
  const recentMovies = movies.slice(0, MAX_RECENTLY_VIEWED);
  storage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentMovies));
  return recentMovies;
}

/**
 * @param {Document} doc
 * @param {RecentlyViewedMovie} movie
 */
function createRecentlyViewedCard(doc, movie) {
  const card = doc.createElement("article");
  card.className = "now-playing-card recently-viewed-card";

  const poster = doc.createElement("img");
  poster.className = "movie-card-poster";
  poster.src = movie.posterUrl;
  poster.alt = `Poster for ${movie.title}`;

  const content = doc.createElement("div");
  content.className = "movie-card-content";

  const title = doc.createElement("h3");
  title.className = "movie-card-title";
  title.textContent = movie.title;

  const details = doc.createElement("p");
  details.className = "movie-card-details";
  details.textContent = [
    movie.genres.map((genre) => genre.name).join(", "),
    `${movie.runtimeMinutes} min`,
  ]
    .filter(Boolean)
    .join(" · ");

  const footer = doc.createElement("div");
  footer.className = "movie-card-footer";

  const ageRating = doc.createElement("span");
  ageRating.className = "movie-card-age-rating";
  ageRating.textContent = `${movie.ageRating.minAge}+`;

  const viewLink = doc.createElement("a");
  viewLink.className = "movie-card-buy-ticket";
  viewLink.href = `/pages/movie-details.html?movie=${encodeURIComponent(movie.slug)}`;
  viewLink.textContent = "View film";
  footer.append(ageRating, viewLink);

  content.append(title, details, footer);
  card.append(poster, content);
  return card;
}

export function initializeRecentlyViewed(doc = document) {
  const section = doc.querySelector("#recently-viewed-section");
  const rail = doc.querySelector(".recently-viewed-rail");
  const status = doc.querySelector(".recently-viewed-status");
  if (!section || !rail || !status) return;

  try {
    const movies = getRecentlyViewedMovies(doc.defaultView.localStorage);
    section.hidden = movies.length === 0;
    rail.replaceChildren(
      ...movies.map((movie) => createRecentlyViewedCard(doc, movie)),
    );
  } catch (error) {
    console.error("Unable to load recently viewed movies:", error);
    section.hidden = false;
    status.textContent = "Recently viewed films could not be loaded.";
    status.hidden = false;
  }
}

if (typeof document !== "undefined") {
  initializeRecentlyViewed();
}
