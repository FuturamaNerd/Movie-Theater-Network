const MOVIES_API_URL =
  "https://api.kinoxii.redberryinternship.ge/api/movies/featured";

export async function fetchMovies() {
  const response = await fetch(MOVIES_API_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch movies: ${response.status}`);
  }

  const payload = await response.json();
  const movies = Array.isArray(payload) ? payload : payload.data;

  if (!Array.isArray(movies)) {
    throw new TypeError("The movies API response must contain a data array");
  }

  return movies;
}