import { getWrappedSlideIndex } from "./carousel-navigation.js";

document.querySelectorAll(".hero-carousel").forEach((carousel) => {
  const slides = [...carousel.querySelectorAll(".carousel-slide")];

  carousel.querySelectorAll(".carousel-button").forEach((button) => {
    button.addEventListener("click", () => {
      const activeIndex = slides.findIndex((slide) =>
        slide.hasAttribute("data-active"),
      );

      if (activeIndex === -1 || slides.length === 0) {
        return;
      }

      const direction = button.classList.contains("next") ? 1 : -1;
      const nextSlideIndex = getWrappedSlideIndex(
        activeIndex,
        direction,
        slides.length,
      );

      delete slides[activeIndex].dataset.active;
      slides[nextSlideIndex].dataset.active = "";
    });
  });
});
