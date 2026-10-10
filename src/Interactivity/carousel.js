import { getWrappedSlideIndex } from "./carousel-navigation.js";
import { fetchFeaturedMovies } from "../API/movies.js";
/** @typedef {import("../models/movie-interfaces.js").MovieWithSynopsisData} MovieWithSynopsisData */

const carousel = document.querySelector(".hero-carousel");

if (carousel) {
  const slideList = carousel.querySelector("ul");
  const controls = carousel.querySelector(".carousel-controls");
  const pagination = carousel.querySelector(".carousel-pagination");
  const status = carousel.querySelector(".carousel-status");

  function setActiveSlide(index, slides, pageButtons) {
    // Set the active slide and update pagination buttons
    slides.forEach((slide, slideIndex) => {
      slide.toggleAttribute("data-active", slideIndex === index);
      pageButtons[slideIndex].toggleAttribute(
        "data-active",
        slideIndex === index,
      );
    });
  }

  async function initializeCarousel() {
    // Fetch title and poster from API and populate the carousel
    try {
      /** @type {MovieWithSynopsisData[]} */
      const movies = await fetchFeaturedMovies();
      if (movies.some((movie) => !movie.title || !(movie.backdropUrl || movie.posterUrl))) {
        throw new TypeError("Each movie must include a title and backdropUrl or posterUrl");
      }

      slideList.replaceChildren(
        // replace placeholder slides in index and populate the carousel with API data
        ...movies.map((movie, index) => {
          // Create a slide for each movie
          const slide = document.createElement("li");
          slide.className = "carousel-slide";
          if (index === 0) slide.setAttribute("data-active", "");

          const poster = document.createElement("img");
          poster.className = "carousel-poster";
          poster.src = movie.backdropUrl || movie.posterUrl;
          poster.alt = "";
          poster.setAttribute("aria-hidden", "true");

          const title = document.createElement("h1");
          title.textContent = movie.title;

          const content = document.createElement("div");
          content.className = "carousel-content";
          const releaseDate = new Date(movie.releaseDate);
          if (!Number.isNaN(releaseDate.getTime())) {
            const premiere = document.createElement("p");
            premiere.className = "carousel-premiere";
            const dateLabel = new Intl.DateTimeFormat("en", {
              day: "numeric",
              month: "short",
              timeZone: "UTC",
            })
              .format(releaseDate)
              .toUpperCase()
              .replace(" SEP", " SEPT");
            premiere.textContent = `PREMIERE · WEEK OF ${dateLabel}`;
            content.append(premiere);
          }

          content.append(title);

          const metadata = document.createElement("ul");
          metadata.className = "carousel-metadata";
          if (Number.isFinite(movie.ageRating?.minAge)) {
            const ageRating = document.createElement("li");
            ageRating.className = "carousel-age-rating";
            ageRating.textContent = String(movie.ageRating.minAge);
            metadata.append(ageRating);
          }
          if (Number.isFinite(movie.runtimeMinutes)) {
            const runtime = document.createElement("li");
            runtime.textContent = `${movie.runtimeMinutes} Min`;
            metadata.append(runtime);
          }
          for (const format of movie.formats ?? []) {
            const formatBadge = document.createElement("li");
            formatBadge.textContent = format.name;
            metadata.append(formatBadge);
          }
          if (metadata.childElementCount > 0) content.append(metadata);

          if (movie.synopsis) {
            const synopsis = document.createElement("p");
            synopsis.className = "carousel-synopsis";
            synopsis.textContent = movie.synopsis;
            content.append(synopsis);
          }

          const actions = document.createElement("div");
          actions.className = "carousel-actions";
          const buyTickets = document.createElement("a");
          buyTickets.className = "carousel-action carousel-buy-tickets";
          buyTickets.href = `/sessions?movie=${encodeURIComponent(movie.slug)}`;
          buyTickets.textContent = "Buy tickets";

          const allSessions = document.createElement("a");
          allSessions.className = "carousel-action carousel-all-sessions";
          allSessions.href = "/sessions";
          allSessions.textContent = "All sessions";
          actions.append(buyTickets, allSessions);
          content.append(actions);
          slide.append(poster, content);
          return slide;
        }),
      );

      const slides = [...slideList.querySelectorAll(".carousel-slide")]; // Get the newly created slides after replacing the placeholder slides
      const pageButtons = movies.map((movie, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "carousel-page";
        button.setAttribute("aria-label", `Show ${movie.title}`);
        if (index === 0) button.setAttribute("data-active", "");
        button.addEventListener("click", () =>
          setActiveSlide(index, slides, pageButtons),
        );
        pagination.append(button);
        return button;
      });

      carousel.querySelectorAll(".carousel-button").forEach((button) => {
        // Add event listeners to the arrow buttons
        button.addEventListener("click", () => {
          const activeIndex = slides.findIndex((slide) =>
            slide.hasAttribute("data-active"),
          );
          const direction = button.classList.contains("next") ? 1 : -1;
          const nextIndex = getWrappedSlideIndex(
            activeIndex,
            direction,
            slides.length,
          );
          setActiveSlide(nextIndex, slides, pageButtons);
        });
      });
      //error handling for empty movie list and API fetch failure
      controls.hidden = movies.length === 0;
      if (movies.length === 0) {
        status.hidden = false;
        status.textContent = "No featured movies are available.";
      }
    } catch (error) {
      console.error("Unable to load featured movies:", error);
      status.hidden = false;
      status.textContent = "Featured movies could not be loaded.";
    }
  }

  initializeCarousel();
}