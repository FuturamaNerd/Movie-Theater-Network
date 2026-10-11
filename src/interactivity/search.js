const SESSIONS_PAGE_PATH = "/pages/sessions.html";

export function initializeSearch(
  doc = document,
  navigate = (path) => doc.defaultView.location.assign(path),
) {
  if (doc.querySelector("#sessions-page")) return;

  function bindSearchForm() {
    const form = doc.querySelector(".header-search");
    if (!form || form.dataset.searchInitialized === "true") return;

    const input = form.querySelector("input[type='search']");
    if (!input) {
      throw new Error("Unable to initialize the header search control");
    }

    form.dataset.searchInitialized = "true";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const url = new URL(SESSIONS_PAGE_PATH, doc.defaultView.location.href);
      const query = input.value.trim();
      if (query) url.searchParams.set("search", query);
      navigate(`${url.pathname}${url.search}`);
    });
  }

  bindSearchForm();
  if (!doc.querySelector(".header-search")) {
    doc.addEventListener("header:rendered", bindSearchForm, { once: true });
  }
}

if (typeof document !== "undefined") {
  initializeSearch();
}
