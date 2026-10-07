import { getWrappedSlideIndex } from "./carousel-navigation.js";
import { fetchMovies } from "../API/movies.js";

const carousel = document.querySelector(".hero-carousel");

if (carousel) {
  const slideList = carousel.querySelector("ul");
  const controls = carousel.querySelector(".carousel-controls");
  const pagination = carousel.querySelector(".carousel-pagination");
  const status = carousel.querySelector(".carousel-status");

  function setActiveSlide(index, slides, pageButtons) {
    slides.forEach((slide, slideIndex) => {
      slide.toggleAttribute("data-active", slideIndex === index);
      pageButtons[slideIndex].toggleAttribute("data-active", slideIndex === index);
    });
  }

  async function initializeCarousel() {
    try {
      const movies = await fetchMovies();
      if (movies.some((movie) => !movie.title || !movie.posterUrl)) {
        throw new TypeError("Each movie must include a title and posterUrl");
      }

      slideList.replaceChildren(
        ...movies.map((movie, index) => {
          const slide = document.createElement("li");
          slide.className = "carousel-slide";
          if (index === 0) slide.setAttribute("data-active", "");

          const poster = document.createElement("img");
          poster.className = "carousel-poster";
          poster.src = movie.posterUrl;
          poster.alt = "";
          poster.setAttribute("aria-hidden", "true");

          const title = document.createElement("h1");
          title.textContent = movie.title;

          const content = document.createElement("div");
          content.className = "carousel-content";
          content.append(title);
          slide.append(poster, content);
          return slide;
        }),
      );

      const slides = [...slideList.querySelectorAll(".carousel-slide")];
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
