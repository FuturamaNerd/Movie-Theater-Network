import { readFileSync } from "node:fs";
import { join } from "node:path";
import { saveAuthSession } from "../../src/Auth/auth-session.js";
import { openBookingModal } from "../../src/interactivity/booking-modal.js";

const bookingModalMarkup = readFileSync(
  join(process.cwd(), "supplementary-content", "booking-modal.html"),
  "utf8",
);

const movie = {
  id: 1,
  slug: "sample-film",
  title: "The Odyssey",
  kind: "film",
  runtimeMinutes: 100,
  posterUrl: "/poster.jpg",
  backdropUrl: "/backdrop.jpg",
  releaseDate: "2026-10-01",
  isComingSoon: false,
  isFeatured: false,
  fromPrice: 14,
  ageRating: { code: "12+", minAge: 12, description: "Ages 12 and over." },
  genres: [],
  formats: [],
};

const session = {
  id: 1476,
  startsAt: "2026-10-11T18:30:00+04:00",
  date: "2026-10-11",
  time: "18:30",
  timeBand: "evening",
  price: 14,
  seatsLeft: 4,
  isSoldOut: false,
  hall: {
    id: 13,
    name: "A",
    venue: { id: 4, slug: "vake", name: "Vake Park", city: "Tbilisi" },
  },
  venue: { id: 4, slug: "vake", name: "Vake Park", city: "Tbilisi" },
  format: { id: 1, slug: "standard", name: "Standard", priceUplift: 0 },
  language: {
    id: 2,
    slug: "georgian-subtitles",
    name: "Georgian Subtitles",
    code: "ENG",
  },
  movie,
};

const seatMap = {
  sessionId: 1476,
  hall: { ...session.hall, venue: session.venue },
  sections: [
    {
      name: "Stalls",
      rows: [
        {
          label: "G",
          seats: [
            { id: 10, code: "G1", label: "1", state: "available", aisleAfter: true, isMine: false },
            { id: 11, code: "G2", label: "2", state: "available", aisleAfter: false, isMine: false },
            { id: 12, code: "G3", label: "3", state: "sold", aisleAfter: false, isMine: false },
            { id: 13, code: "G4", label: "4", state: "held", aisleAfter: false, isMine: false },
            { id: 14, code: "G5", label: "5", state: "unavailable", aisleAfter: false, isMine: false },
          ],
        },
      ],
    },
    {
      name: "Balcony",
      rows: [{
        label: "J",
        seats: [
          { id: 15, code: "J1", label: "1", state: "available", aisleAfter: false, isMine: false },
          { id: 16, code: "J2", label: "2", state: "available", aisleAfter: false, isMine: false },
        ],
      }],
    },
  ],
};

const filterOptions = {
  ticketTypes: [
    { id: 1, slug: "adult", name: "Adult", priceRatio: 1, note: null, blockedFromRatingAge: null },
    { id: 2, slug: "child", name: "Child", priceRatio: 0.6, note: null, blockedFromRatingAge: 16 },
    { id: 3, slug: "student", name: "Student", priceRatio: 0.75, note: null, blockedFromRatingAge: null },
  ],
  maxSeatsPerOrder: 3,
  holdMinutes: 8,
};

function setup() {
  document.body.innerHTML = `
    <button class="login-button" type="button">Log in</button>
    <main id="movie-details-page"></main>
  `;
  window.sessionStorage.clear();
  saveAuthSession(
    {
      token: "booking-token",
      user: {
        id: 7,
        username: "jane",
        email: "jane@example.test",
        age: 30,
        fullName: "Jane Dolidze",
        mobileNumber: "599123456",
        dateOfBirth: "1996-01-01",
        profileComplete: true,
      },
    },
    window.sessionStorage,
  );
  window.fetch = jest.fn(async (url) => {
    if (String(url).endsWith("/supplementary-content/booking-modal.html")) {
      return {
        ok: true,
        status: 200,
        text: async () => bookingModalMarkup,
      };
    }
    if (String(url).endsWith("/filter-options")) {
      return { ok: true, status: 200, json: async () => ({ data: filterOptions }) };
    }
    if (String(url).endsWith("/sessions/1476/seats")) {
      return { ok: true, status: 200, json: async () => ({ data: seatMap }) };
    }
    if (String(url).endsWith("/sessions/1476")) {
      return { ok: true, status: 200, json: async () => ({ data: session }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}

describe("booking modal", () => {
  beforeEach(setup);

  afterEach(() => {
    window.sessionStorage.clear();
    delete window.fetch;
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("opens for a selected showtime and renders each API seat-map section", async () => {
    await openBookingModal(document, session.id, movie);

    const modal = document.querySelector(".booking-modal");
    expect(modal.getAttribute("role")).toBe("dialog");
    expect(modal.textContent).toContain("The Odyssey");
    expect(modal.textContent).toContain("Vake Park · Hall A · Sunday, October 11 · 18:30 · Standard · Georgian Subtitles");
    expect(modal.querySelectorAll(".booking-seat-section")).toHaveLength(2);
    expect(modal.querySelector(".booking-row-label").textContent).toBe("G");
    expect(modal.querySelectorAll(".booking-aisle")).toHaveLength(1);
    expect(modal.querySelector('[data-seat-code="G3"]').disabled).toBe(true);
    expect(modal.querySelector('[data-seat-code="G4"]').disabled).toBe(true);
    expect(modal.querySelector('[data-seat-code="G5"]').tagName).toBe("SPAN");
    expect(modal.querySelector('[data-seat-code="G5"]').getAttribute("aria-hidden")).toBe("true");
  });

  it("limits selection and sends seat IDs and chosen ticket types to the hold endpoint", async () => {
    await openBookingModal(document, session.id, movie);
    const modal = document.querySelector(".booking-modal");
    modal.querySelector('[data-seat-code="G1"]').click();
    modal.querySelector('[data-seat-code="G2"]').click();
    modal.querySelector('[data-seat-code="J1"]').click();
    modal.querySelector('[data-seat-code="J2"]').click();

    expect(modal.querySelectorAll(".booking-seat-summary-row")).toHaveLength(3);
    expect(modal.querySelector(".booking-status").textContent).toContain("Up to 3 seats");
    expect(
      modal.querySelector('.booking-ticket-type option[value="child"]'),
    ).not.toBeNull();

    window.fetch.mockImplementation(async (url, options) => {
      if (String(url).endsWith("/sessions/1476/holds")) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              holdId: "hold-uuid",
              sessionId: 1476,
              expiresAt: new Date(Date.now() + 8 * 60_000).toISOString(),
              secondsRemaining: 480,
              isLive: true,
              subtotal: 42,
              seats: [],
            },
          }),
        };
      }
      return setupFetch(url, options);
    });
    modal.querySelector(".booking-next").click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const holdCall = window.fetch.mock.calls.find(([url]) =>
      String(url).endsWith("/sessions/1476/holds"),
    );
    expect(JSON.parse(holdCall[1].body)).toEqual({
      seats: [
        { seatId: 10, ticketType: "adult" },
        { seatId: 11, ticketType: "adult" },
        { seatId: 15, ticketType: "adult" },
      ],
    });
    expect(modal.dataset.step).toBe("checkout");
    expect(modal.querySelector(".booking-countdown").textContent).toMatch(
      /^Seats held · (08:00|07:\d{2})$/,
    );
  });

  it("renders purchase confirmation from the order response", async () => {
    await openBookingModal(document, session.id, movie);
    const modal = document.querySelector(".booking-modal");
    modal.querySelector('[data-seat-code="G1"]').click();
    window.fetch.mockImplementation(async (url, options) => {
      if (String(url).endsWith("/sessions/1476/holds")) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              holdId: "hold-uuid",
              sessionId: 1476,
              expiresAt: new Date(Date.now() + 8 * 60_000).toISOString(),
              secondsRemaining: 480,
              isLive: true,
              subtotal: 14,
              seats: [{ seatId: 10, code: "G1", ticketType: { slug: "adult", name: "Adult" }, price: 14 }],
            },
          }),
        };
      }
      if (String(url).endsWith("/orders")) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              id: 9,
              reference: "KX-7QF2LD",
              status: "paid",
              totalPrice: 14,
              paidAt: "2026-10-11T18:30:00+04:00",
              refundedAt: null,
              isUpcoming: true,
              isRefundable: true,
              cardLastFour: "4242",
              contact: { fullName: "Jane Dolidze", email: "jane@example.test", mobileNumber: "599123456" },
              session,
              tickets: [{ id: 99, seatCode: "G1", ticketType: { slug: "adult", name: "Adult" }, price: 14 }],
            },
          }),
        };
      }
      return setupFetch(url, options);
    });

    modal.querySelector(".booking-next").click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    modal.querySelector("#booking-card-number").value = "4242 4242 4242 4242";
    modal.querySelector("#booking-expiry").value = "12/30";
    modal.querySelector("#booking-cvv").value = "123";
    modal.querySelector(".booking-payment-form").requestSubmit();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(modal.dataset.step).toBe("confirmation");
    expect(modal.textContent).toContain("KX-7QF2LD");
    expect(modal.textContent).toContain("G1");
    expect(modal.textContent).toContain("Card ending in 4242");
    const orderRequest = window.fetch.mock.calls.find(([url]) =>
      String(url).endsWith("/orders"),
    );
    expect(JSON.parse(orderRequest[1].body)).toMatchObject({
      holdId: "hold-uuid",
      cardNumber: "4242 4242 4242 4242",
      expiry: "12/30",
      cvv: "123",
    });
  });
});

function setupFetch(url, _options) {
  if (String(url).endsWith("/supplementary-content/booking-modal.html")) {
    return {
      ok: true,
      status: 200,
      text: async () => bookingModalMarkup,
    };
  }
  if (String(url).endsWith("/filter-options")) {
    return { ok: true, status: 200, json: async () => ({ data: filterOptions }) };
  }
  if (String(url).endsWith("/sessions/1476/seats")) {
    return { ok: true, status: 200, json: async () => ({ data: seatMap }) };
  }
  if (String(url).endsWith("/sessions/1476")) {
    return { ok: true, status: 200, json: async () => ({ data: session }) };
  }
  throw new Error(`Unexpected request: ${url}`);
}
