import { initializeSignupModal } from "../../src/interactivity/signup-modal.js";

describe("sign-up modal", () => {
  afterEach(() => {
    delete window.bootstrap;
    document.body.innerHTML = "";
    jest.restoreAllMocks();
    delete global.fetch;
  });

  it("opens when the header sign-up button is clicked", () => {
    const modalMarkup =
      '<div id="signupModal" class="modal" aria-hidden="true"></div>';
    const showModal = jest.fn().mockImplementation(() => {
      const modal = document.querySelector("#signupModal");
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
    });
    const getOrCreateInstance = jest.fn().mockReturnValue({ show: showModal });
    document.body.innerHTML = '<button class="sign-up-button">Sign Up</button>';
    window.bootstrap = {
      Modal: { getOrCreateInstance },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(modalMarkup),
    });

    initializeSignupModal(document);
    document.querySelector(".sign-up-button").click();

    return new Promise((resolve) => window.setTimeout(resolve, 0)).then(() => {
      const modal = document.querySelector("#signupModal");
      expect(global.fetch).toHaveBeenCalledWith(
        "/supplementary-content/sign-up-modal.html",
      );
      expect(getOrCreateInstance).toHaveBeenCalledWith(modal);
      expect(showModal).toHaveBeenCalledTimes(1);
      expect(modal.classList.contains("show")).toBe(true);
      expect(modal.getAttribute("aria-hidden")).toBe("false");
    });
  });
});
