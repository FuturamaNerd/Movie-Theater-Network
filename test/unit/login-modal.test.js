import { initializeLoginModal } from "../../src/interactivity/login-modal.js";

describe("login modal", () => {
  afterEach(() => {
    delete window.bootstrap;
    delete window.fetch;
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("loads and opens when the header login button is clicked", async () => {
    const modalMarkup = `
      <div id="loginModal">
        <form>
          <div class="login-field"><input name="email" /></div>
          <div class="login-field"><input name="password" /></div>
          <a class="login-signup-link" href="#signup">Sign up</a>
        </form>
      </div>
    `;
    document.body.innerHTML = '<button class="login-button">Log in</button>';
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(modalMarkup),
    });
    const show = jest.fn();
    window.bootstrap = {
      Modal: { getOrCreateInstance: jest.fn().mockReturnValue({ show }) },
    };
    initializeLoginModal(document);

    document.querySelector(".login-button").click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(window.fetch).toHaveBeenCalledWith(
      "/supplementary-content/login-modal.html",
    );
    expect(show).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector("#loginModal form").dataset.loginInitialized,
    ).toBe("true");
  });
});
