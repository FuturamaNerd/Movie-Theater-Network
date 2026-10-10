import { fetchComingSoonMovies, fetchNowPlayingMovies } from "../API/movies.js";

/** @typedef {import("../models/movie-interfaces").MovieData} MovieData */

/**
 * @param {MovieData} movie
 * @param {boolean} isNowPlaying
 */
function createMovieCard(movie, isNowPlaying) {
  const card = document.createElement("article");
  card.className = isNowPlaying ? "now-playing-card" : "coming-soon-card";
  card.setAttribute(
    "aria-label",
    `${movie.title}, ${isNowPlaying ? "now playing" : "coming soon"}`,
  );

  const poster = document.createElement("img");
  poster.className = "movie-card-poster";
  poster.src = movie.backdropUrl;
  poster.alt = `Poster for ${movie.title}`;

  const content = document.createElement("div");
  content.className = "movie-card-content";

  const title = document.createElement("h3");
  title.className = "movie-card-title";
  title.textContent = movie.title;

  const details = document.createElement("p");
  details.className = "movie-card-details";
  const genres = movie.genres.map((genre) => genre.name).join(", ");
  details.textContent = [genres, `${movie.runtimeMinutes} min`]
    .filter(Boolean)
    .join(" · ");

  const footer = document.createElement("div");
  footer.className = "movie-card-footer";

  const ageRating = document.createElement("span");
  ageRating.className = "movie-card-age-rating";
  ageRating.textContent = String(movie.ageRating.minAge);
  footer.append(ageRating);

  if (isNowPlaying) {
    const buyTicket = document.createElement("a");
    buyTicket.className = "movie-card-buy-ticket";
    buyTicket.href = `/sessions?movie=${encodeURIComponent(movie.slug)}`;
    buyTicket.textContent = "Buy Ticket";
    footer.append(buyTicket);
  }

  content.append(title, details, footer);
  card.append(poster, content);
  return card;
}

/**
 * @param {string} railSelector
 * @param {string} statusSelector
 * @param {() => Promise<MovieData[]>} fetchMovies
 * @param {boolean} isNowPlaying
 */
async function populateMovieSection(
  railSelector,
  statusSelector,
  fetchMovies,
  isNowPlaying,
) {
  const rail = document.querySelector(railSelector);
  const status = document.querySelector(statusSelector);
  if (!(rail instanceof HTMLElement) || !(status instanceof HTMLElement)) {
    console.error(`Unable to find movie section elements for ${railSelector}.`);
    return;
  }

  try {
    const movies = await fetchMovies();
    rail.replaceChildren(
      ...movies.map((movie) => createMovieCard(movie, isNowPlaying)),
    );
    if (movies.length === 0) {
      status.hidden = false;
      status.textContent = `No ${isNowPlaying ? "now playing" : "coming soon"} movies are available.`;
    }
  } catch (error) {
    console.error(`Unable to load ${isNowPlaying ? "now playing" : "coming soon"} movies:`, error);
    status.hidden = false;
    status.textContent = "Movies could not be loaded.";
  }
}

populateMovieSection(
  ".now-playing-rail",
  ".now-playing-status",
  fetchNowPlayingMovies,
  true,
);
populateMovieSection(
  ".coming-soon-rail",
  ".coming-soon-status",
  fetchComingSoonMovies,
  false,
);
