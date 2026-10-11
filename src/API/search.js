const SEARCH_ENDPOINT = "https://api.kinoxii.redberryinternship.ge/api/search";
const MAX_SEARCH_RESULTS = 6;

/**
 * @param {string} query
 * @param {Document} [doc]
 * @returns {Promise<import("../models/movie-interfaces").MovieData[]>}
 */
export async function searchMovies(query, doc = document) {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  const response = await doc.defaultView.fetch(url);
  if (!response.ok) {
    throw new Error(`Movie search failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.data)) {
    throw new TypeError("Movie search response did not contain a data array");
  }
  return payload.data.slice(0, MAX_SEARCH_RESULTS);
}
