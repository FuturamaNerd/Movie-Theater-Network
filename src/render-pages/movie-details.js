import {
  getAuthSession,
  restoreAuthSession,
} from "../Auth/auth-session.js";
import { recordRecentlyViewedMovie } from "../interactivity/recently-viewed.js";

const API_BASE = "https://api.kinoxii.redberryinternship.ge/api";

function localDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function nextSevenDates(today = new Date()) {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return localDate(date);
  });
}

function dateLabel(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
    number: new Intl.DateTimeFormat("en", { day: "numeric" }).format(date),
  };
}

function requiredElement(doc, selector) {
  const element = doc.querySelector(selector);
  if (!element) throw new Error(`Film details page is missing ${selector}`);
  return element;
}

function setText(doc, selector, text) {
  requiredElement(doc, selector).textContent = text;
}

function showStatus(doc, message) {
  const status = requiredElement(doc, "#movie-details-status");
  status.textContent = message;
  status.hidden = false;
}

function renderMovie(doc, movie) {
  doc.title = `${movie.title} | Kino XII`;
  const hero = requiredElement(doc, "#movie-details-hero");
  const content = requiredElement(doc, "#movie-details-content");
  const backdrop = requiredElement(doc, "#movie-details-backdrop");
  const poster = requiredElement(doc, "#movie-details-poster");
  requiredElement(doc, ".movie-details-kicker").textContent = movie.isComingSoon
    ? "Coming soon"
    : "Now showing";
  backdrop.src = movie.backdropUrl;
  backdrop.alt = "";
  poster.src = movie.posterUrl;
  poster.alt = `Poster for ${movie.title}`;
  setText(doc, "#movie-details-title", movie.title);
  setText(doc, "#movie-details-synopsis", movie.synopsis);
  setText(doc, "#movie-details-rating", movie.ageRating.code);
  const rating = requiredElement(doc, "#movie-details-rating");
  rating.title = movie.ageRating.description;
  rating.setAttribute(
    "aria-label",
    `${movie.ageRating.code}: ${movie.ageRating.description}`,
  );
  setText(doc, "#movie-details-runtime", `${movie.runtimeMinutes} min`);
  setText(
    doc,
    "#movie-details-formats",
    movie.formats.map((format) => format.name).join(" · "),
  );
  setText(doc, "#movie-details-director", movie.director);
  setText(doc, "#movie-details-cast", movie.cast);
  setText(
    doc,
    "#movie-details-genres",
    movie.genres.map((genre) => genre.name).join(", "),
  );
  setText(
    doc,
    "#movie-details-release",
    new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
      new Date(`${movie.releaseDate}T12:00:00`),
    ),
  );
  setText(doc, "#movie-details-duration", `${movie.runtimeMinutes} minutes`);
  const ratingCopy = requiredElement(doc, "#movie-details-rating-copy");
  ratingCopy.textContent = movie.ageRating.description;
  ratingCopy.title = movie.ageRating.description;
  hero.hidden = false;
  content.hidden = false;
}

function renderDates(doc, movie, dates, selectedDate, onSelect) {
  const root = requiredElement(doc, "#movie-details-dates");
  root.replaceChildren();
  const available = new Set(movie.availableDates);
  for (const dateValue of dates) {
    const label = dateLabel(dateValue);
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "movie-details-date-option";
    button.dataset.date = dateValue;
    button.disabled = !available.has(dateValue);
    button.setAttribute("aria-pressed", String(dateValue === selectedDate));
    const day = doc.createElement("span");
    day.className = "movie-details-date-day";
    day.textContent = label.day;
    const number = doc.createElement("strong");
    number.className = "movie-details-date-number";
    number.textContent = label.number;
    button.append(day, number);
    button.addEventListener("click", () => onSelect(dateValue));
    root.append(button);
  }
}

function isUnderAge(movie, user) {
  return (
    Boolean(user) &&
    Number.isFinite(movie.ageRating.minAge) &&
    movie.ageRating.minAge > 0 &&
    (!Number.isFinite(user.age) || user.age < movie.ageRating.minAge)
  );
}

function renderShowtimes(doc, movie, groups, onShowtimeClick) {
  const root = requiredElement(doc, "#movie-details-venue-list");
  const empty = requiredElement(doc, "#movie-details-empty");
  const ageError = requiredElement(doc, "#movie-details-age-error");
  const session = getAuthSession(doc.defaultView.sessionStorage);
  const user = session?.user;
  const underAge = isUnderAge(movie, user);
  const ageUnverified = Boolean(
    session &&
      movie.ageRating.minAge > 0 &&
      !Number.isFinite(user.age),
  );
  ageError.hidden = !(underAge || ageUnverified);
  ageError.textContent = underAge
    ? Number.isFinite(user.age)
      ? `This film is rated ${movie.ageRating.code}. You cannot buy tickets for it with this account.`
      : `This film is rated ${movie.ageRating.code}. We could not verify this account's age.`
    : "";
  root.replaceChildren();

  const venues = groups.filter((group) => group.sessions.length > 0);
  empty.hidden = venues.length > 0;
  for (const group of venues) {
    const section = doc.createElement("section");
    section.className = "movie-details-venue";
    const heading = doc.createElement("h3");
    heading.textContent = group.venue.name;
    section.append(heading);

    const showtimeList = doc.createElement("div");
    showtimeList.className = "movie-details-showtime-list";
    for (const session of group.sessions) {
      const unavailable = session.isSoldOut || underAge;
      const showtime = doc.createElement(unavailable ? "button" : "a");
      showtime.className = "movie-details-showtime";
      if (unavailable) {
        showtime.type = "button";
        showtime.setAttribute("aria-disabled", "true");
        showtime.disabled = true;
      } else {
        showtime.href = `/pages/seat-selection.html?sessionId=${encodeURIComponent(session.id)}`;
        showtime.dataset.requiresAuth = "true";
        showtime.addEventListener("click", (event) => {
          if (onShowtimeClick(session, event, showtime)) event.preventDefault();
        });
      }
      showtime.dataset.sessionId = String(session.id);
      const venue = doc.createElement("span");
      venue.className = "movie-details-showtime-venue";
      venue.textContent = session.venue.name;
      const time = doc.createElement("strong");
      time.textContent = session.time;
      const format = doc.createElement("span");
      format.className = "movie-details-showtime-format";
      format.title = session.language.name;
      format.textContent = `Hall ${session.hall.name} · ${session.format.name} · ${session.language.code}`;
      const seats = doc.createElement("span");
      seats.className = "movie-details-showtime-seats";
      seats.textContent = session.isSoldOut
        ? "Sold out"
        : `${session.seatsLeft} seats`;
      const price = doc.createElement("span");
      price.className = "movie-details-showtime-price";
      price.textContent = `₾${session.price}`;
      showtime.append(venue, time, format, seats, price);
      showtimeList.append(showtime);
    }
    section.append(showtimeList);
    root.append(section);
  }
}

export async function initializeMovieDetailsPage(
  doc = document,
  { today = new Date() } = {},
) {
  const params = new URLSearchParams(doc.defaultView.location.search);
  const movieSlug = params.get("movie") || params.get("slug");
  if (!movieSlug) {
    showStatus(doc, "A film was not specified.");
    return;
  }

  try {
    await restoreAuthSession(doc);
    const movieResponse = await doc.defaultView.fetch(
      `${API_BASE}/movies/${encodeURIComponent(movieSlug)}`,
    );
    if (movieResponse.status === 404) {
      showStatus(doc, "This film could not be found.");
      return;
    }
    if (!movieResponse.ok) {
      throw new Error(`Failed to load film details: ${movieResponse.status}`);
    }
    const moviePayload = await movieResponse.json();
    const movie = moviePayload?.data;
    if (
      !movie ||
      !Array.isArray(movie.availableDates) ||
      !Array.isArray(movie.formats) ||
      !Array.isArray(movie.genres)
    ) {
      throw new TypeError("Film details response is missing required fields");
    }
    recordRecentlyViewedMovie(movie, doc.defaultView.localStorage);
    renderMovie(doc, movie);

    const todayValue = localDate(today);
    const dates = nextSevenDates(today);
    const selectedDate =
      dates.find((date) => movie.availableDates.includes(date)) || todayValue;
    const onShowtimeClick = (_session, event, showtime) => {
      const session = getAuthSession(doc.defaultView.sessionStorage);
      const user = session?.user;
      if (
        session &&
        movie.ageRating.minAge > 0 &&
        !Number.isFinite(user.age)
      ) {
        event.preventDefault();
        restoreAuthSession(doc)
          .then((restoredSession) => {
            if (!restoredSession || !Number.isFinite(restoredSession.user.age)) {
              throw new Error("Unable to verify account age");
            }
            if (isUnderAge(movie, restoredSession.user)) {
              const ageError = requiredElement(doc, "#movie-details-age-error");
              ageError.textContent = `This film is rated ${movie.ageRating.code}. You cannot buy tickets for it with this account.`;
              ageError.hidden = false;
              return;
            }
            doc.defaultView.location.assign(showtime.href);
          })
          .catch((error) => {
            console.error(error);
            showStatus(doc, "Unable to verify your age. Please try again.");
          });
        return true;
      }
      if (isUnderAge(movie, user)) {
        event.preventDefault();
        const ageError = requiredElement(doc, "#movie-details-age-error");
        ageError.textContent = `This film is rated ${movie.ageRating.code}. You cannot buy tickets for it with this account.`;
        ageError.hidden = false;
        return true;
      }
      return false;
    };
    let currentGroups = [];
    doc.addEventListener("auth:login", () => {
      renderShowtimes(doc, movie, currentGroups, onShowtimeClick);
    });

    async function loadDate(date) {
      for (const button of requiredElement(doc, "#movie-details-dates").children) {
        button.setAttribute("aria-pressed", String(button.dataset.date === date));
      }
      const sessionsResponse = await doc.defaultView.fetch(
        `${API_BASE}/movies/${encodeURIComponent(movieSlug)}/sessions?date=${encodeURIComponent(date)}`,
      );
      if (!sessionsResponse.ok) {
        throw new Error(`Failed to load film sessions: ${sessionsResponse.status}`);
      }
      const sessionsPayload = await sessionsResponse.json();
      if (!Array.isArray(sessionsPayload?.data)) {
        throw new TypeError("Film sessions response must contain a data array");
      }
      currentGroups = sessionsPayload.data;
      renderShowtimes(doc, movie, currentGroups, onShowtimeClick);
    }

    renderDates(doc, movie, dates, selectedDate, loadDate);
    await loadDate(selectedDate);
  } catch (error) {
    console.error(error);
    showStatus(doc, "Unable to load this film. Please try again.");
  }
}

if (typeof document !== "undefined" && document.querySelector("#movie-details-page")) {
  initializeMovieDetailsPage().catch((error) => {
    console.error(error);
  });
}
