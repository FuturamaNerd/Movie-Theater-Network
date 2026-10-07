describe("carousel controls", () => {
  const movies = [
    { title: "First Film", posterUrl: "https://example.test/first.jpg" },
    { title: "Second Film", posterUrl: "https://example.test/second.jpg" },
    { title: "Third Film", posterUrl: "https://example.test/third.jpg" },
    { title: "Fourth Film", posterUrl: "https://example.test/fourth.jpg" },
  ];

  beforeEach(() => {
    cy.intercept("GET", "**/api/movies/featured", {
      body: { data: movies },
    });
    cy.visit("/");
  });

  it("renders movie data and wraps between slides", () => {
    const slides = ".hero-carousel .carousel-slide";

    cy.get(slides).should("have.length", movies.length);
    cy.get(`${slides}[data-active]`).should("have.length", 1);
    cy.get(slides).eq(0).find("h1").should("have.text", "First Film");
    cy.get(slides)
      .eq(0)
      .find("img")
      .should("have.attr", "src", "https://example.test/first.jpg");
    cy.get(slides).eq(0).should("have.css", "opacity", "1");
    cy.get(slides).eq(1).should("have.css", "opacity", "0");

    cy.get(".hero-carousel .carousel-button.next").click();
    cy.get(slides).eq(1).should("have.css", "opacity", "1");
    cy.get(slides).eq(0).should("have.css", "opacity", "0");

    cy.get(".hero-carousel .carousel-button.prev").click();
    cy.get(slides).eq(0).should("have.css", "opacity", "1");

    cy.get(".hero-carousel .carousel-button.prev").click();
    cy.get(slides).eq(3).should("have.css", "opacity", "1");

    cy.get(".hero-carousel .carousel-button.next").click();
    cy.get(slides).eq(0).should("have.css", "opacity", "1");
  });
});
