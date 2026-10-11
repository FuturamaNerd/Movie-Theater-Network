import { fetchFeaturedMovies } from "../../src/API/movies.js";

describe("fetchFeaturedMovies", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  it("returns movies from the API", () => {
    const movies = [{ title: "Test Movie", posterUrl: "/poster.jpg" }];
    const json = jest.fn().mockResolvedValue({ data: movies });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json });
    const fetchSpy = global.fetch;

    return expect(fetchFeaturedMovies()).resolves.toEqual(movies).then(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.kinoxii.redberryinternship.ge/api/movies/featured",
      );
    });
  });

  it("reports an unsuccessful API response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(fetchFeaturedMovies()).rejects.toThrow(
      "Failed to fetch featured movies: 503",
    );
  });
});
