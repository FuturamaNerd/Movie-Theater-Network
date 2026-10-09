const FEATURED_MOVIES_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/movies/featured";

const MOVIES_COMiNG_SOON_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/movies/coming-soon";

const MOVIES_NOW_PLAYING_ENDPOINT =
  "https://api.kinoxii.redberryinternship.ge/api/movies/now-playing";

export async function fetchFeaturedMovies() {
  const response = await fetch(FEATURED_MOVIES_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Failed to fetch featured movies: ${response.status}`);
  }

  const payload = await response.json();
  const movies = Array.isArray(payload) ? payload : payload.data;

  if (!Array.isArray(movies)) {
    throw new TypeError("The featured movies API response must contain a data array");
  }

  return movies;
}

export async function fetchComingSoonMovies() {
  const response = await fetch(MOVIES_COMING_SOON_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Failed to fetch coming soon movies: ${response.status}`);
  }

  const payload = await response.json();
  const movies = Array.isArray(payload) ? payload : payload.data;

  if (!Array.isArray(movies)) {
    throw new TypeError("The coming soon movies API response must contain a data array");
  }

  return movies;
}

export async function fetchNowPlayingMovies() {
  const response = await fetch(MOVIES_NOW_PLAYING_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Failed to fetch now playing movies: ${response.status}`);
  }

  const payload = await response.json();
  const movies = Array.isArray(payload) ? payload : payload.data;

  if (!Array.isArray(movies)) {
    throw new TypeError("The now playing movies API response must contain a data array");
  }

  return movies;
}