import { initializeSearch } from "../../src/interactivity/search.js";

describe("header search", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    delete window.fetch;
    jest.restoreAllMocks();
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

  it("shows live search results in an overlay and links to the movie detail", async () => {
    document.body.innerHTML = `
      <form class="header-search">
        <input type="search" />
        <button type="submit"><img src="/styles/SVG/search.svg" alt="" /></button>
      </form>
    `;
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          id: 12,
          slug: "quiet-galaxy",
          title: "Quiet Galaxy",
          kind: "film",
          runtimeMinutes: 112,
          posterUrl: "/quiet-galaxy.jpg",
          backdropUrl: "/quiet-galaxy-backdrop.jpg",
          releaseDate: "2026-10-01",
          isComingSoon: false,
          isFeatured: false,
          fromPrice: 12,
          ageRating: { code: "12+", minAge: 12, description: "12+" },
          genres: [{ id: 1, slug: "adventure", name: "Adventure" }],
          formats: [],
        }],
      }),
    });
    initializeSearch(document, jest.fn());
    const headerInput = document.querySelector(".header-search input");
    headerInput.focus();

    const overlay = document.querySelector(".search-overlay");
    expect(overlay.hidden).toBe(false);
    expect(overlay.querySelector(".search-overlay-prompt")).not.toBeNull();
    const overlayInput = overlay.querySelector("#search-overlay-input");
    overlayInput.value = "quiet";
    overlayInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 300));

    const result = overlay.querySelector(".search-result");
    expect(result.getAttribute("href")).toBe(
      "/pages/movie-details.html?movie=quiet-galaxy",
    );
    expect(result.textContent).toContain("Quiet Galaxy");
    expect(result.textContent).toContain("from ₾12");
    expect(overlay.querySelector(".search-browse-all").getAttribute("href")).toBe(
      "/pages/sessions.html?search=quiet",
    );
    expect(window.fetch.mock.calls[0][0].searchParams.get("q")).toBe("quiet");
  });

  it("shows an explicit empty state when the search API returns no matches", async () => {
    document.body.innerHTML = `
      <form class="header-search">
        <input type="search" />
        <button type="submit">Search</button>
      </form>
    `;
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    initializeSearch(document, jest.fn());
    document.querySelector(".header-search input").focus();
    const overlayInput = document.querySelector("#search-overlay-input");
    overlayInput.value = "unknown";
    overlayInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 300));

    expect(document.querySelector(".search-overlay-empty").textContent).toContain(
      "No results",
    );
  });
});
