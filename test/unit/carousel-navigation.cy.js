import { getWrappedSlideIndex } from "../../JS-modules/Interactivity/carousel-navigation.js";

describe("carousel slide index wrapping", () => {
  it("wraps forward from the last slide to the first", () => {
    expect(getWrappedSlideIndex(3, 1, 4)).to.equal(0);
  });

  it("wraps backward from the first slide to the last", () => {
    expect(getWrappedSlideIndex(0, -1, 4)).to.equal(3);
  });

  it("throws when there are no slides", () => {
    expect(() => getWrappedSlideIndex(0, 1, 0)).to.throw(
      "slideCount must be a positive integer",
    );
  });
});
