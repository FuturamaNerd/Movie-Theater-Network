export function getWrappedSlideIndex(currentIndex, direction, slideCount) { 
  if (!Number.isInteger(slideCount) || slideCount <= 0) {
    throw new RangeError("slideCount must be a positive integer");
  }

  return ((currentIndex + direction) % slideCount + slideCount) % slideCount;
}
