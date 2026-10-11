import { saveAuthSession } from "../../src/Auth/auth-session.js";
import { fetchHold, fetchTickets, refundOrder } from "../../src/API/tickets.js";
import { initializeTickets } from "../../src/render-pages/tickets.js";

const session = {
  id: 7,
  startsAt: "2026-10-20T20:00:00+04:00",
  date: "2026-10-20",
  time: "20:00",
  timeBand: "evening",
  price: 14,
  seatsLeft: 20,
  isSoldOut: false,
  hall: { id: 3, name: "A", venue: { id: 1, slug: "galleria", name: "Galleria", city: "Tbilisi" } },
  venue: { id: 1, slug: "galleria", name: "Galleria", city: "Tbilisi" },
  format: { id: 1, slug: "standard", name: "Standard", priceUplift: 0 },
  language: { id: 1, slug: "georgian-dub", name: "Georgian Dub", code: "GEO" },
  movie: {
    id: 2,
    slug: "quiet-galaxy",
    title: "Quiet Galaxy",
    kind: "film",
    runtimeMinutes: 100,
    posterUrl: "/poster.jpg",
    backdropUrl: "/backdrop.jpg",
    releaseDate: "2026-10-01",
    isComingSoon: false,
    isFeatured: false,
    fromPrice: 14,
    ageRating: { code: "12+", minAge: 12, description: "12+" },
    genres: [],
    formats: [],
  },
};

const order = {
  id: 4,
  reference: "KX-7QF2LD",
  status: "paid",
  totalPrice: 14,
  paidAt: "2026-10-11T18:30:00+04:00",
  refundedAt: null,
  isUpcoming: true,
  isRefundable: true,
  cardLastFour: "4242",
  contact: { fullName: "Jane Doe", email: "jane@example.test", mobileNumber: "599123456" },
  session,
  tickets: [{ id: 99, seatCode: "A1", ticketType: { slug: "adult", name: "Adult" }, price: 14 }],
};

function setup() {
  document.body.innerHTML = `
    <button class="tab active" id="profile-tab" type="button" aria-selected="true">Profile</button>
    <button class="tab" id="tickets-tab" type="button" aria-selected="false">Tickets</button>
    <section id="profile-panel"></section>
    <section id="tickets-panel" hidden></section>
  `;
  window.sessionStorage.clear();
  saveAuthSession(
    { token: "tickets-test-token", user: { id: 1, username: "jane" } },
    window.sessionStorage,
  );
}

describe("tickets endpoints and profile tickets panel", () => {
  beforeEach(setup);

  afterEach(() => {
    window.sessionStorage.clear();
    delete window.fetch;
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("fetches upcoming and past ticket lists through the filter parameter", async () => {
    window.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [order] }),
    });

    await expect(fetchTickets("upcoming", document)).resolves.toEqual([order]);
    await expect(fetchTickets("past", document)).resolves.toEqual([order]);

    expect(window.fetch.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.kinoxii.redberryinternship.ge/api/tickets?filter=upcoming",
      "https://api.kinoxii.redberryinternship.ge/api/tickets?filter=past",
    ]);
  });

  it("retrieves a persisted hold by its hold ID", async () => {
    const hold = {
      holdId: "hold-uuid",
      sessionId: 7,
      expiresAt: "2026-10-11T20:00:00+04:00",
      secondsRemaining: 480,
      isLive: true,
      subtotal: 14,
      seats: [{ seatId: 71, code: "A1", ticketType: { slug: "adult", name: "Adult" }, price: 14 }],
    };
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: hold }),
    });

    await expect(fetchHold("hold-uuid", document)).resolves.toEqual(hold);
    expect(String(window.fetch.mock.calls[0][0])).toBe(
      "https://api.kinoxii.redberryinternship.ge/api/holds/hold-uuid",
    );
  });

  it("confirms refunds and renders the API-updated order in Past", async () => {
    const refunded = {
      ...order,
      status: "refunded",
      refundedAt: "2026-10-11T19:00:00+04:00",
      isUpcoming: false,
      isRefundable: false,
    };
    window.fetch = jest.fn((url) =>
      String(url).endsWith("/tickets?filter=upcoming")
        ? Promise.resolve({
            ok: true,
            json: async () => ({ data: [order] }),
          })
        : Promise.resolve({
            ok: true,
            json: async () => ({ data: refunded }),
          }),
    );
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    initializeTickets(document);
    document.querySelector("#tickets-tab").click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const refundButton = document.querySelector(".ticket-refund-button");
    expect(refundButton.textContent).toBe("Request refund");
    refundButton.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(confirm).toHaveBeenCalledWith(
      "Refund order KX-7QF2LD? This action cannot be undone.",
    );
    expect(window.fetch.mock.calls.some(([url, options]) =>
      String(url).endsWith("/orders/KX-7QF2LD/refund") && options.method === "POST",
    )).toBe(true);
    expect(document.querySelector(".ticket-order-card").textContent).toContain(
      "Refunded",
    );
    expect(document.querySelector(".ticket-order-card .ticket-refund-button")).toBeNull();
  });
});
