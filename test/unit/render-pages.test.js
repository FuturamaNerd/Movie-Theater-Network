describe("page chrome renderers", () => {
  beforeEach(() => {
    document.body.innerHTML = "<main></main>";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
    jest.restoreAllMocks();
  });

  it("renders the header at the start of the body and announces it", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<header><button class="sign-up-button">Sign Up</button></header>'),
    });
    const headerRendered = jest.fn();
    document.addEventListener("header:rendered", headerRendered);

    jest.isolateModules(() => {
      require("../../src/render-pages/add-header-start.js");
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledWith(
      "/supplementary-content/header.html",
    );
    expect(document.body.firstElementChild.tagName).toBe("HEADER");
    expect(document.querySelector(".sign-up-button")).not.toBeNull();
    expect(headerRendered).toHaveBeenCalledTimes(1);
    expect(headerRendered.mock.calls[0][0].detail.header.tagName).toBe(
      "HEADER",
    );
  });

  it("renders the footer at the end of the body", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<footer>All rights reserved</footer>"),
    });

    jest.isolateModules(() => {
      require("../../src/render-pages/add-footer-end.js");
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledWith(
      "/supplementary-content/footer.html",
    );
    expect(document.body.lastElementChild.tagName).toBe("FOOTER");
    expect(document.body.lastElementChild.textContent).toBe(
      "All rights reserved",
    );
  });
});
