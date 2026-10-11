import { initializeSearch } from "../../src/interactivity/search.js";

describe("header search", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("routes searches to the sessions page with the query", () => {
    document.body.innerHTML = `
      <form class="header-search">
        <input type="search" />
        <button type="submit"><img src="/styles/SVG/search.svg" alt="" /></button>
      </form>
    `;
    const navigate = jest.fn();
    initializeSearch(document, navigate);
    const form = document.querySelector(".header-search");
    form.querySelector("input").value = "Sample Movie";
    form.querySelector("button").click();

    expect(navigate).toHaveBeenCalledWith(
      "/pages/sessions.html?search=Sample+Movie",
    );
  });
});
