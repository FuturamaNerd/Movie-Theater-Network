describe("carousel controls", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("selects placeholder slides and wraps at either end", () => {
    const slides = ".hero-carousel .carousel-slide";

    cy.get(slides).should("have.length", 4);
    cy.get(`${slides}[data-active]`).should("have.length", 1);
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
