import {
  fetchComingSoonMovies,
  fetchNowPlayingMovies,
  MovieNotificationError,
  notifyWhenMovieOpens,
} from "../API/movies.js";

/** @typedef {import("../models/movie-interfaces.js").MovieData} MovieData */

/**
 * @param {MovieData} movie
 * @param {boolean} isNowPlaying
 * @param {Document} [doc]
 */
export function createMovieCard(movie, isNowPlaying, doc = document) {
  const card = doc.createElement("article");
  card.className = isNowPlaying ? "now-playing-card" : "coming-soon-card";
  card.setAttribute(
    "aria-label",
    `${movie.title}, ${isNowPlaying ? "now playing" : "coming soon"}`,
  );

  const poster = doc.createElement("img");
  poster.className = "movie-card-poster";
  poster.src = movie.backdropUrl;
  poster.alt = `Poster for ${movie.title}`;

  const content = doc.createElement("div");
  content.className = "movie-card-content";

  const title = doc.createElement("h3");
  title.className = "movie-card-title";
  title.textContent = movie.title;

  const details = doc.createElement("p");
  details.className = "movie-card-details";
  const genres = movie.genres.map((genre) => genre.name).join(", ");
  details.textContent = [genres, `${movie.runtimeMinutes} min`]
    .filter(Boolean)
    .join(" · ");

  const footer = doc.createElement("div");
  footer.className = "movie-card-footer";

  const ageRating = doc.createElement("span");
  ageRating.className = "movie-card-age-rating";
  ageRating.textContent = `${movie.ageRating.minAge}+`;
  footer.append(ageRating);

  if (isNowPlaying) {
    const buyTicket = doc.createElement("a");
    buyTicket.className = "movie-card-buy-ticket";
    buyTicket.href = `/pages/sessions.html?search=${encodeURIComponent(movie.title)}`;
    buyTicket.textContent = "Buy Ticket";
    footer.append(buyTicket);
  } else {
    const notifyButton = doc.createElement("button");
    notifyButton.className = "movie-card-notify";
    notifyButton.type = "button";
    notifyButton.dataset.requiresAuth = "true";
    const icon = doc.createElement("img");
    icon.src = "/styles/SVG/notify.svg";
    icon.alt = "";
    const label = doc.createElement("span");
    label.textContent = "Notify me";
    notifyButton.append(icon, label);

    const status = doc.createElement("p");
    status.className = "movie-notify-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;

    const replayAfterLogin = () => notifyButton.click();
    notifyButton.addEventListener("click", async () => {
      status.hidden = true;
      status.textContent = "";
      doc.addEventListener("auth:login", replayAfterLogin, { once: true });

      try {
        await notifyWhenMovieOpens(movie.slug, doc);
        doc.removeEventListener("auth:login", replayAfterLogin);
        status.textContent = "You'll be notified when this title opens.";
        status.hidden = false;
      } catch (error) {
        if (!(error instanceof MovieNotificationError && error.status === 401)) {
          doc.removeEventListener("auth:login", replayAfterLogin);
        }
        status.textContent =
          error instanceof MovieNotificationError && error.status === 404
            ? "This title could not be found."
            : error instanceof MovieNotificationError && error.status === 401
              ? "Log in to be notified when this title opens."
              : "Unable to subscribe. Please try again.";
        status.hidden = false;
        console.error("Unable to subscribe to movie notifications:", error);
      }
    });

    footer.append(notifyButton);
    content.append(title, details, footer, status);
    card.append(poster, content);
    return card;
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
 * @param {Document} [doc]
 */
async function populateMovieSection(
  railSelector,
  statusSelector,
  fetchMovies,
  isNowPlaying,
  doc = document,
) {
  const rail = doc.querySelector(railSelector);
  const status = doc.querySelector(statusSelector);
  if (!(rail instanceof HTMLElement) || !(status instanceof HTMLElement)) {
    console.error(`Unable to find movie section elements for ${railSelector}.`);
    return;
  }

  try {
    const movies = await fetchMovies();
    rail.replaceChildren(
      ...movies.map((movie) => createMovieCard(movie, isNowPlaying, document)),
    );
    if (movies.length === 0) {
      status.hidden = false;
      status.textContent = `No ${isNowPlaying ? "now playing" : "coming soon"} movies are available.`;
    }
  } catch (error) {
    console.error(
      `Unable to load ${isNowPlaying ? "now playing" : "coming soon"} movies:`,
      error,
    );
    status.hidden = false;
    status.textContent = "Movies could not be loaded.";
  }
}

export function initializeMovieSections(doc = document) {
  if (!doc.querySelector(".now-playing-rail")) return;
  populateMovieSection(
    ".now-playing-rail",
    ".now-playing-status",
    fetchNowPlayingMovies,
    true,
    doc,
  );
  populateMovieSection(
    ".coming-soon-rail",
    ".coming-soon-status",
    fetchComingSoonMovies,
    false,
    doc,
  );
}

if (typeof document !== "undefined") {
  initializeMovieSections();
}
