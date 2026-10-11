import {
  fetchComingSoonMovies,
  fetchNowPlayingMovies,
} from "../API/movies.js";
import { createMovieCard } from "./movie-sections.js";

export async function initializeMovieCatalogue(doc = document) {
  const root = doc.querySelector("#movie-catalogue-page");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const type = new URLSearchParams(doc.defaultView.location.search).get("type");
  const isNowPlaying = type !== "coming-soon";
  root.classList.toggle("is-coming-soon", !isNowPlaying);
  const title = doc.querySelector("#movie-catalogue-title");
  const status = doc.querySelector("#movie-catalogue-status");
  const list = doc.querySelector("#movie-catalogue-list");
  title.textContent = isNowPlaying ? "Now Playing" : "Coming Soon";
  doc.title = `${title.textContent} | Kino XII`;

  try {
    const movies = isNowPlaying
      ? await fetchNowPlayingMovies()
      : await fetchComingSoonMovies();
    list.replaceChildren(
      ...movies.map((movie) => createMovieCard(movie, isNowPlaying, doc)),
    );
    if (movies.length === 0) {
      status.textContent = `No ${isNowPlaying ? "now playing" : "coming soon"} movies are available.`;
      status.hidden = false;
    }
  } catch (error) {
    console.error("Unable to load movie catalogue:", error);
    status.textContent = "Movies could not be loaded. Please try again.";
    status.hidden = false;
  }
}

if (typeof document !== "undefined" && document.querySelector("#movie-catalogue-page")) {
  initializeMovieCatalogue();
}
