import { handleUnauthorizedResponse } from "../Auth/auth-session.js";

const API_BASE = "https://api.kinoxii.redberryinternship.ge/api";
const FILTER_OPTIONS_URL = `${API_BASE}/filter-options`;
const SESSIONS_URL = `${API_BASE}/sessions`;
const ARRAY_FILTERS = ["venues[]", "formats[]", "languages[]", "bands[]"];
const DEFAULT_SORT = "time_asc";

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readSessionFilters(search = window.location.search) {
  const params = new URLSearchParams(search);
  const readArray = (shortName, apiName) => {
    const values = [...params.getAll(shortName), ...params.getAll(apiName)];
    return values.flatMap((value) => value.split(",")).filter(Boolean);
  };
  return {
    date: params.get("date") || localDate(),
    venues: readArray("venue", "venues[]"),
    formats: readArray("format", "formats[]"),
    languages: readArray("language", "languages[]"),
    bands: readArray("band", "bands[]"),
    search: params.get("search") || "",
    sort: params.get("sort") || DEFAULT_SORT,
    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
  };
}

export function buildSessionsUrlQuery(filters) {
  const params = new URLSearchParams();
  if (filters.venues.length) params.set("venue", filters.venues.join(","));
  if (filters.date) params.set("date", filters.date);
  if (filters.formats.length) params.set("format", filters.formats.join(","));
  if (filters.languages.length) {
    params.set("language", filters.languages.join(","));
  }
  if (filters.bands.length) params.set("band", filters.bands.join(","));
  if (filters.search) params.set("search", filters.search);
  params.set("sort", filters.sort || DEFAULT_SORT);
  params.set("page", String(filters.page || 1));
  return params.toString();
}

function addDays(date, days) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return localDate(next);
}

export function buildSessionsQuery(filters) {
  const params = new URLSearchParams();
  if (filters.date) params.set("date", filters.date);
  for (const filterName of ARRAY_FILTERS) {
    const values = filters[filterName.slice(0, -2)] || [];
    for (const value of values) params.append(filterName, value);
  }
  if (filters.search) params.set("search", filters.search);
  params.set("sort", filters.sort || DEFAULT_SORT);
  params.set("page", String(filters.page || 1));
  return params.toString();
}

function appendCheckboxGroup(doc, root, title, name, options, selected, disabled = new Set()) {
  const fieldset = doc.createElement("fieldset");
  fieldset.className = "session-filter-group";
  const legend = doc.createElement("legend");
  legend.textContent = title;
  fieldset.append(legend);

  for (const option of options) {
    const label = doc.createElement("label");
    label.className = "session-filter-option";
    const checkbox = doc.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = name;
    checkbox.value = option.value;
    checkbox.checked = selected.includes(option.value);
    checkbox.disabled = disabled.has(option.value);
    const text = doc.createElement("span");
    text.textContent = option.label;
    label.append(checkbox, text);
    fieldset.append(label);
  }
  root.append(fieldset);
}

function getAvailableFormats(options, selectedVenues) {
  if (!selectedVenues.length) return options.formats;
  const venueSlugs = new Set(selectedVenues);
  const allowed = new Set(
    options.venues
      .filter((venue) => venueSlugs.has(venue.slug))
      .flatMap((venue) => (venue.formats || []).map((format) => format.slug)),
  );
  return options.formats.filter((format) => allowed.has(format.slug));
}

function renderFilters(doc, root, options, filters) {
  root.replaceChildren();
  appendCheckboxGroup(
    doc,
    root,
    "Venue",
    "venues[]",
    options.venues.map((venue) => ({
      value: venue.slug,
      label: `${venue.name} · ${venue.city}`,
    })),
    filters.venues,
  );

  const availableFormats = getAvailableFormats(options, filters.venues);
  appendCheckboxGroup(
    doc,
    root,
    "Format",
    "formats[]",
    availableFormats.map((format) => ({
      value: format.slug,
      label: format.name,
    })),
    filters.formats,
  );
  appendCheckboxGroup(
    doc,
    root,
    "Language",
    "languages[]",
    options.languages.map((language) => ({
      value: language.slug,
      label: language.name,
    })),
    filters.languages,
  );
  appendCheckboxGroup(
    doc,
    root,
    "Time of day",
    "bands[]",
    options.timeBands.map((band) => ({ value: band.id, label: band.label })),
    filters.bands,
  );
}

function renderSortOptions(doc, select, options, selected) {
  select.replaceChildren();
  for (const sort of options.sorts) {
    const option = doc.createElement("option");
    option.value = sort.id;
    option.textContent = sort.label;
    option.selected = sort.id === selected;
    select.append(option);
  }
  if (!options.sorts.some((sort) => sort.id === selected)) {
    select.value = DEFAULT_SORT;
  }
}

function dateLabel(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
    number: String(date.getDate()),
  };
}

function renderDateStrip(doc, root, selectedDate) {
  root.replaceChildren();
  const date = new Date(`${localDate()}T12:00:00`);
  for (let offset = 0; offset < 7; offset += 1) {
    const dateValue = localDate(date);
    const label = dateLabel(dateValue);
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "session-date-button";
    button.dataset.date = dateValue;
    button.setAttribute("aria-pressed", String(dateValue === selectedDate));
    const dayName = doc.createElement("span");
    dayName.textContent = label.day;
    const dayNumber = doc.createElement("strong");
    dayNumber.textContent = label.number;
    button.append(dayName, dayNumber);
    root.append(button);
    date.setDate(date.getDate() + 1);
  }
}

function renderSessionCard(doc, session) {
  const card = doc.createElement(session.isSoldOut ? "article" : "a");
  card.className = "session-showtime";
  if (session.isSoldOut) {
    card.classList.add("is-sold-out");
  } else {
    card.href = `/pages/seat-selection.html?sessionId=${encodeURIComponent(session.id)}`;
    card.dataset.requiresAuth = "true";
  }

  const time = doc.createElement("div");
  time.className = "session-showtime-time";
  const timeText = doc.createElement("span");
  timeText.textContent = session.time;
  const availability = doc.createElement("span");
  availability.className = "session-showtime-state";
  availability.textContent = session.isSoldOut
    ? "Sold out"
    : `${session.seatsLeft} seats`;
  time.append(timeText, availability);

  const meta = doc.createElement("div");
  meta.className = "session-showtime-meta";
  const venue = doc.createElement("span");
  venue.textContent = `${session.venue.name} · Hall ${session.hall.name}`;
  const format = doc.createElement("span");
  format.className = "session-showtime-format";
  format.textContent = `${session.format.name} · ${session.language.name}`;
  const price = doc.createElement("strong");
  price.className = "session-showtime-price";
  price.textContent = `from ₾${session.price}`;
  meta.append(venue, format, price);

  card.append(time, meta);
  card.setAttribute(
    "aria-label",
    `${session.time}, ${venue.textContent}, ${availability.textContent}`,
  );
  if (session.isSoldOut) {
    card.setAttribute("aria-disabled", "true");
    card.tabIndex = -1;
  }
  return card;
}

function renderMovieGroups(doc, root, groups) {
  root.replaceChildren();
  for (const group of groups) {
    const movie = group.movie;
    const article = doc.createElement("article");
    article.className = "session-movie";

    const poster = doc.createElement("img");
    poster.className = "session-movie-poster";
    poster.src = movie.posterUrl || "";
    poster.alt = `Poster for ${movie.title}`;

    const details = doc.createElement("div");
    details.className = "session-movie-details";
    const heading = doc.createElement("div");
    heading.className = "session-movie-heading";
    const title = doc.createElement("h2");
    title.textContent = movie.title;
    const runtime = doc.createElement("p");
    runtime.textContent = `${movie.runtimeMinutes} min`;
    const rating = doc.createElement("span");
    rating.className = "session-age-rating";
    rating.textContent = movie.ageRating.code;
    heading.append(title, runtime, rating);
    const genres = doc.createElement("p");
    genres.className = "session-movie-genres";
    genres.textContent = movie.genres.map((genre) => genre.name).join(" · ");

    const showtimes = doc.createElement("div");
    showtimes.className = "session-showtimes";
    for (const session of group.sessions) {
      showtimes.append(renderSessionCard(doc, session));
    }
    details.append(heading, genres, showtimes);
    article.append(poster, details);
    root.append(article);
  }
}

function renderPagination(doc, nav, meta, onPageChange) {
  const summary = nav.querySelector("#sessions-page-summary");
  nav.replaceChildren();
  nav.hidden = meta.lastPage < 1;
  if (nav.hidden) return;

  const addButton = (text, page, label, current = false, disabled = false) => {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    button.disabled = disabled;
    if (current) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => onPageChange(page));
    nav.append(button);
  };

  addButton("‹", meta.currentPage - 1, "Previous page", false, meta.currentPage <= 1);
  const start = Math.max(1, Math.min(meta.currentPage - 2, meta.lastPage - 4));
  const end = Math.min(meta.lastPage, start + 4);
  for (let page = start; page <= end; page += 1) {
    addButton(String(page), page, `Page ${page}`, page === meta.currentPage);
  }
  addButton("›", meta.currentPage + 1, "Next page", false, meta.currentPage >= meta.lastPage);
  const pageSummary = summary || doc.createElement("span");
  pageSummary.id = "sessions-page-summary";
  pageSummary.textContent = `Page ${meta.currentPage} of ${meta.lastPage}`;
  nav.append(pageSummary);
}

function selectedFilterValues(root) {
  return [...root.querySelectorAll("input[type='checkbox']:checked")].reduce(
    (filters, input) => {
      (filters[input.name.slice(0, -2)] ||= []).push(input.value);
      return filters;
    },
    { venues: [], formats: [], languages: [], bands: [] },
  );
}

function showStatus(status, message) {
  status.hidden = !message;
  status.textContent = message;
}

function renderActiveFilterCount(element, filters) {
  if (!element) return;
  const count =
    filters.venues.length +
    filters.formats.length +
    filters.languages.length +
    filters.bands.length +
    Number(Boolean(filters.search));
  element.textContent = `${count} filters active`;
}

export async function initializeSessionsPage(doc = document) {
  const page = doc.querySelector("#sessions-page");
  if (!page || page.dataset.initialized === "true") return;
  page.dataset.initialized = "true";

  const filtersRoot = doc.querySelector("#session-filter-groups");
  const dateInput = doc.querySelector("#sessions-date");
  const dateStrip = doc.querySelector("#sessions-date-strip");
  let searchInput;
  let searchButton;
  const sortSelect = doc.querySelector("#sessions-sort");
  const groupsRoot = doc.querySelector("#session-movie-list");
  const pagination = doc.querySelector("#sessions-pagination");
  const count = doc.querySelector("#sessions-count");
  const activeFilterCount = doc.querySelector("#active-filter-count");
  const status = doc.querySelector("#sessions-status");
  const clearButton = doc.querySelector("#clear-session-filters");

  let filters = readSessionFilters(doc.defaultView.location.search);
  let filterOptions;
  let requestNumber = 0;

  async function fetchSessions() {
    const currentRequest = ++requestNumber;
    showStatus(status, "Loading sessions…");
    groupsRoot.replaceChildren();
    pagination.hidden = true;
    try {
      const response = await doc.defaultView.fetch(
        `${SESSIONS_URL}?${buildSessionsQuery(filters)}`,
      );
      handleUnauthorizedResponse(response, doc);
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.status}`);
      }
      const result = await response.json();
      if (currentRequest !== requestNumber) return;
      if (!Array.isArray(result?.data) || !result?.meta) {
        throw new TypeError("Sessions response did not contain grouped data and pagination");
      }

      renderMovieGroups(doc, groupsRoot, result.data);
      count.textContent =
        result.meta.totalSessions === 0 || result.data.length === 0
          ? "No sessions found"
          : `Showing ${result.meta.totalSessions} sessions`;
      showStatus(status, "");
      renderPagination(doc, pagination, result.meta, (pageNumber) => {
        updateUrl({ ...filters, page: pageNumber }, false);
      });
    } catch (error) {
      if (currentRequest !== requestNumber) return;
      showStatus(status, "Sessions could not be loaded. Please try again.");
      console.error(error);
    }
  }

  function syncControls() {
    dateInput.value = filters.date;
    dateInput.min = localDate();
    dateInput.max = addDays(localDate(), 6);
    if (searchInput) searchInput.value = filters.search;
    renderSortOptions(doc, sortSelect, filterOptions, filters.sort);
    renderFilters(doc, filtersRoot, filterOptions, filters);
    renderDateStrip(doc, dateStrip, filters.date);
    renderActiveFilterCount(activeFilterCount, filters);
  }

  function updateUrl(nextFilters, replace = false) {
    filters = nextFilters;
    const url = new URL(doc.defaultView.location.href);
    url.search = buildSessionsUrlQuery(filters);
    if (replace) {
      doc.defaultView.history.replaceState({}, "", url);
    } else {
      doc.defaultView.history.pushState({}, "", url);
    }
    syncControls();
    fetchSessions();
  }

  function bindHeaderSearch() {
    const headerSearch = doc.querySelector(".header-search");
    if (!headerSearch || headerSearch.dataset.sessionsSearchInitialized === "true") {
      return;
    }
    searchInput = headerSearch.querySelector("input[type='search']");
    searchButton = headerSearch.querySelector("button");
    if (!searchInput || !searchButton) {
      throw new Error("Unable to initialize the sessions search control");
    }

    headerSearch.dataset.sessionsSearchInitialized = "true";
    searchButton.disabled = !filterOptions;
    searchInput.value = filters.search;
    const submitSearch = () => {
      if (!filterOptions) return;
      updateUrl({ ...filters, search: searchInput.value.trim(), page: 1 });
    };
    searchButton.addEventListener("click", (event) => {
      event.preventDefault();
      submitSearch();
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitSearch();
      }
    });
  }

  bindHeaderSearch();
  if (!searchInput) {
    doc.addEventListener("header:rendered", bindHeaderSearch, { once: true });
  }

  try {
    const response = await doc.defaultView.fetch(FILTER_OPTIONS_URL);
    handleUnauthorizedResponse(response, doc);
    if (!response.ok) {
      throw new Error(`Failed to load filter options: ${response.status}`);
    }
    const result = await response.json();
    filterOptions = result?.data;
    if (
      !filterOptions ||
      !Array.isArray(filterOptions.venues) ||
      !Array.isArray(filterOptions.formats) ||
      !Array.isArray(filterOptions.languages) ||
      !Array.isArray(filterOptions.timeBands) ||
      !Array.isArray(filterOptions.sorts)
    ) {
      throw new TypeError("Filter options response is missing required filter lists");
    }

    const selectedVenues = filters.venues.filter((slug) =>
      filterOptions.venues.some((venue) => venue.slug === slug),
    );
    filters = {
      ...filters,
      venues: selectedVenues,
      formats: filters.formats.filter((slug) =>
        getAvailableFormats(filterOptions, selectedVenues).some(
          (format) => format.slug === slug,
        ),
      ),
      languages: filters.languages.filter((slug) =>
        filterOptions.languages.some((language) => language.slug === slug),
      ),
      bands: filters.bands.filter((id) =>
        filterOptions.timeBands.some((band) => band.id === id),
      ),
      sort: filterOptions.sorts.some((sort) => sort.id === filters.sort)
        ? filters.sort
        : DEFAULT_SORT,
    };
    if (searchButton) searchButton.disabled = false;
    const normalizedUrl = new URL(doc.defaultView.location.href);
    normalizedUrl.search = buildSessionsUrlQuery(filters);
    doc.defaultView.history.replaceState({}, "", normalizedUrl);
    syncControls();
    await fetchSessions();
  } catch (error) {
    showStatus(status, "Session filters could not be loaded. Please try again.");
    filtersRoot.replaceChildren();
    console.error(error);
  }

  filtersRoot.addEventListener("change", (event) => {
    if (!(event.target instanceof doc.defaultView.HTMLInputElement)) return;
    const selected = selectedFilterValues(filtersRoot);
    const availableFormats = new Set(
      getAvailableFormats(filterOptions, selected.venues).map(
        (format) => format.slug,
      ),
    );
    selected.formats = selected.formats.filter((format) =>
      availableFormats.has(format),
    );
    updateUrl({ ...filters, ...selected, page: 1 });
  });

  dateInput.addEventListener("change", () => {
    if (dateInput.value) updateUrl({ ...filters, date: dateInput.value, page: 1 });
  });
  dateStrip.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (button) updateUrl({ ...filters, date: button.dataset.date, page: 1 });
  });
  sortSelect.addEventListener("change", () => {
    updateUrl({ ...filters, sort: sortSelect.value, page: 1 });
  });
  clearButton.addEventListener("click", () => {
    updateUrl(
      {
        date: filters.date,
        venues: [],
        formats: [],
        languages: [],
        bands: [],
        search: "",
        sort: DEFAULT_SORT,
        page: 1,
      },
    );
  });
  doc.defaultView.addEventListener("popstate", () => {
    filters = readSessionFilters(doc.defaultView.location.search);
    syncControls();
    fetchSessions();
  });
}

if (typeof document !== "undefined") {
  initializeSessionsPage();
}
