import { fetchMovies } from "../../JS-modules/API/movies.js";

describe("fetchMovies", () => {
  it("returns movies from the API", () => {
    const movies = [{ title: "Test Movie", posterUrl: "/poster.jpg" }];
    const json = cy.stub().resolves({ data: movies });
    cy.stub(window, "fetch").resolves({ ok: true, json });

    return fetchMovies().then((result) => {
      expect(result).to.deep.equal(movies);
      expect(window.fetch).to.have.been.calledOnceWith(
        "https://api.kinoxii.redberryinternship.ge/api/movies/featured",
      );
    });
  });

  it("reports an unsuccessful API response", () => {
    cy.stub(window, "fetch").resolves({ ok: false, status: 503 });

    return fetchMovies().then(
      () => {
        throw new Error("Expected fetchMovies to reject");
      },
      (error) => expect(error.message).to.include("503"),
    );
  });
});
