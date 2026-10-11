import { searchMovies } from "../API/search.js";

const SESSIONS_PAGE_PATH = "/pages/sessions.html";
const SEARCH_DEBOUNCE_MS = 250;

function createOverlay(doc) {
  const overlay = doc.createElement("div");
  overlay.className = "search-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="search-overlay-panel" role="dialog" aria-modal="true" aria-label="Search films and events">
      <form class="search-overlay-form" role="search">
        <label class="visually-hidden" for="search-overlay-input">Search films and events</label>
        <input id="search-overlay-input" type="search" autocomplete="off" placeholder="Search titles" />
        <button class="search-overlay-close" type="button" aria-label="Close search">&times;</button>
      </form>
      <div class="search-overlay-content" aria-live="polite">
        <p class="search-overlay-prompt">What do you want to watch?<br />Search by title.</p>
      </div>
      <a class="search-browse-all" href="${SESSIONS_PAGE_PATH}">Browse all sessions</a>
    </section>`;
  doc.body.append(overlay);
  return overlay;
}

function createMovieResult(doc, movie) {
  const result = doc.createElement("a");
  result.className = "search-result";
  result.href = `/pages/movie-details.html?movie=${encodeURIComponent(movie.slug)}`;

  const poster = doc.createElement("img");
  poster.className = "search-result-poster";
  poster.src = movie.posterUrl || movie.backdropUrl || "";
  poster.alt = "";

  const details = doc.createElement("span");
  details.className = "search-result-details";
  const title = doc.createElement("strong");
  title.textContent = movie.title;
  const metadata = doc.createElement("span");
  const genre = movie.genres?.[0]?.name;
  metadata.textContent = [genre, movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : ""]
    .filter(Boolean)
    .join(" · ");
  details.append(title, metadata);

  const availability = doc.createElement("span");
  availability.className = movie.isComingSoon
    ? "search-result-release is-coming-soon"
    : "search-result-release";
  availability.textContent = movie.isComingSoon
    ? "Coming Soon"
    : movie.fromPrice != null
      ? `from ₾${movie.fromPrice}`
      : "Now Showing";
  result.append(poster, details, availability);
  return result;
}

function sessionSearchUrl(query, doc) {
  const url = new URL(SESSIONS_PAGE_PATH, doc.defaultView.location.href);
  if (query) url.searchParams.set("search", query);
  return `${url.pathname}${url.search}`;
}

export function initializeSearch(
  doc = document,
  navigate = (path) => doc.defaultView.location.assign(path),
) {
  function bindSearchForm() {
    const form = doc.querySelector(".header-search");
    if (!form || form.dataset.searchInitialized === "true") return;
    const input = form.querySelector("input[type='search']");
    if (!input) throw new Error("Unable to initialize the header search control");

    form.dataset.searchInitialized = "true";
    const overlay = createOverlay(doc);
    const overlayInput = overlay.querySelector("#search-overlay-input");
    const content = overlay.querySelector(".search-overlay-content");
    const browseAll = overlay.querySelector(".search-browse-all");
    let debounceTimer;
    let requestId = 0;
    let suppressFocusOpen = false;

    function closeOverlay() {
      overlay.hidden = true;
      doc.body.classList.remove("search-overlay-open");
      if (debounceTimer) doc.defaultView.clearTimeout(debounceTimer);
      input.setAttribute("aria-expanded", "false");
    }

    function showPrompt(message, className = "search-overlay-prompt") {
      const prompt = doc.createElement("p");
      prompt.className = className;
      prompt.textContent = message;
      content.replaceChildren(prompt);
    }

    function renderResults(movies, query) {
      if (movies.length === 0) {
        showPrompt(`No results for “${query}”.`, "search-overlay-empty");
        return;
      }
      const heading = doc.createElement("h2");
      heading.className = "search-results-heading";
      heading.textContent = "Films & Events";
      const list = doc.createElement("div");
      list.className = "search-results-list";
      for (const movie of movies) list.append(createMovieResult(doc, movie));
      content.replaceChildren(heading, list);
    }

    function search(query) {
      const currentRequest = ++requestId;
      if (debounceTimer) doc.defaultView.clearTimeout(debounceTimer);
      if (query) showPrompt("Searching…", "search-overlay-loading");
      debounceTimer = doc.defaultView.setTimeout(async () => {
        try {
          const movies = await searchMovies(query, doc);
          if (currentRequest !== requestId || overlay.hidden) return;
          if (!query) showPrompt("What do you want to watch? Search by title.");
          else renderResults(movies, query);
        } catch (error) {
          if (currentRequest !== requestId) return;
          showPrompt("Search is unavailable. Please try again.", "search-overlay-error");
          console.error("Unable to search movies:", error);
        }
      }, SEARCH_DEBOUNCE_MS);
    }

    function openOverlay() {
      overlay.hidden = false;
      doc.body.classList.add("search-overlay-open");
      input.setAttribute("aria-expanded", "true");
      overlayInput.value = input.value;
      browseAll.href = sessionSearchUrl(overlayInput.value.trim(), doc);
      overlayInput.focus();
      search(overlayInput.value.trim());
    }

    form.addEventListener("focusin", () => {
      if (suppressFocusOpen) {
        suppressFocusOpen = false;
        return;
      }
      if (overlay.hidden) openOverlay();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = overlay.hidden ? input.value.trim() : overlayInput.value.trim();
      closeOverlay();
      navigate(sessionSearchUrl(query, doc));
    });
    overlay.querySelector(".search-overlay-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const query = overlayInput.value.trim();
      closeOverlay();
      navigate(sessionSearchUrl(query, doc));
    });
    overlayInput.addEventListener("input", () => {
      input.value = overlayInput.value;
      browseAll.href = sessionSearchUrl(overlayInput.value.trim(), doc);
      search(overlayInput.value.trim());
    });
    overlay.querySelector(".search-overlay-close").addEventListener("click", closeOverlay);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeOverlay();
    });
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !overlay.hidden) {
        suppressFocusOpen = true;
        closeOverlay();
        input.focus();
      }
    });
    doc.addEventListener("click", (event) => {
      if (!overlay.hidden && !overlay.contains(event.target) && !form.contains(event.target)) {
        closeOverlay();
      }
    });
    input.addEventListener("input", () => {
      if (!overlay.hidden) {
        overlayInput.value = input.value;
        browseAll.href = sessionSearchUrl(input.value.trim(), doc);
        search(input.value.trim());
      }
    });
    input.setAttribute("aria-haspopup", "dialog");
    input.setAttribute("aria-expanded", "false");
  }

  bindSearchForm();
  if (!doc.querySelector(".header-search")) {
    doc.addEventListener("header:rendered", bindSearchForm, { once: true });
  }
}

if (typeof document !== "undefined") {
  initializeSearch();
}
