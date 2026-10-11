import {
  getAuthSession,
  handleUnauthorizedResponse,
} from "../Auth/auth-session.js";

const API_BASE = "https://api.kinoxii.redberryinternship.ge/api";
let bookingOptionsPromise;
/** @typedef {import("../models/movie-interfaces").BookingFilterOptions} BookingFilterOptions */
/** @typedef {import("../models/movie-interfaces").MovieData} MovieData */
/** @typedef {import("../models/movie-interfaces").OrderData} OrderData */
/** @typedef {import("../models/movie-interfaces").SeatData} SeatData */
/** @typedef {import("../models/movie-interfaces").SeatHold} SeatHold */
/** @typedef {import("../models/movie-interfaces").SeatMap} SeatMap */
/** @typedef {import("../models/movie-interfaces").SessionData} SessionData */
/** @typedef {import("../models/movie-interfaces").TicketType} TicketType */
/** @typedef {{ seatId: number, ticketType: TicketType["slug"] }} SeatSelection */

async function loadBookingMarkup(doc) {
  const response = await doc.defaultView.fetch(
    "/supplementary-content/booking-modal.html",
  );
  if (!response.ok) {
    throw new Error(`Failed to load booking modal: ${response.status}`);
  }

  const modalDocument = new doc.defaultView.DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const modal = modalDocument.querySelector(".booking-modal");
  if (!modal) {
    throw new Error("Booking modal markup was not found in the response");
  }
  return doc.importNode(modal, true);
}

function displayDate(session, doc) {
  const date = new Date(`${session.date}T12:00:00`);
  return new doc.defaultView.Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatMoney(amount) {
  return `₾${Number(amount.toFixed(2))}`;
}

function showStatus(modal, message, kind = "warning") {
  const status = modal.querySelector(".booking-status");
  status.className = `booking-status is-${kind}`;
  status.textContent = message;
  status.hidden = !message;
}

function getHeaders(doc, json = false) {
  const session = getAuthSession(doc.defaultView.sessionStorage);
  const headers = { Accept: "application/json" };
  if (json) headers["Content-Type"] = "application/json";
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  return headers;
}

async function readPayload(response) {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("The booking API returned invalid JSON");
    }
    throw error;
  }
}

async function request(doc, path, options = {}) {
  const response = await doc.defaultView.fetch(`${API_BASE}${path}`, options);
  handleUnauthorizedResponse(response, doc);
  const payload = response.status === 204 ? null : await readPayload(response);
  return { response, payload };
}

async function loadFilterOptions(doc) {
  if (!bookingOptionsPromise) {
    bookingOptionsPromise = request(doc, "/filter-options")
      .then(({ response, payload }) => {
        if (!response.ok) {
          throw new Error(`Failed to load booking options: ${response.status}`);
        }
        const options = payload?.data;
        if (
          !Array.isArray(options?.ticketTypes) ||
          !options.ticketTypes.every(
            (ticket) =>
              typeof ticket?.slug === "string" &&
              typeof ticket.name === "string" &&
              typeof ticket.priceRatio === "number" &&
              (ticket.blockedFromRatingAge == null ||
                Number.isInteger(ticket.blockedFromRatingAge)),
          ) ||
          !Number.isInteger(options.maxSeatsPerOrder) ||
          !Number.isInteger(options.holdMinutes)
        ) {
          throw new TypeError("Booking options response is missing required values");
        }
        return options;
      })
      .catch((error) => {
        bookingOptionsPromise = undefined;
        throw error;
      });
  }
  return bookingOptionsPromise;
}

async function loadSession(doc, sessionId) {
  const { response, payload } = await request(
    doc,
    `/sessions/${encodeURIComponent(sessionId)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load session: ${response.status}`);
  }
  const session = payload?.data;
  if (
    !session ||
    Number(session.id) !== Number(sessionId) ||
    !session.movie ||
    !Array.isArray(session.movie.genres) ||
    !session.venue ||
    !session.hall ||
    !session.format ||
    !session.language
  ) {
    throw new TypeError("Session response is missing required booking details");
  }
  return session;
}

async function loadSeatMap(doc, sessionId) {
  const { response, payload } = await request(
    doc,
    `/sessions/${encodeURIComponent(sessionId)}/seats`,
    { headers: getHeaders(doc) },
  );
  if (!response.ok) {
    throw new Error(`Failed to load seat map: ${response.status}`);
  }
  const seatMap = payload?.data;
  if (
    !seatMap ||
    Number(seatMap.sessionId) !== Number(sessionId) ||
    !Array.isArray(seatMap.sections) ||
    !seatMap.hall
  ) {
    throw new TypeError("Seat map response is missing its hall layout");
  }
  return seatMap;
}

function isChildTicketAllowed(movie, ticketType) {
  return (
    ticketType.blockedFromRatingAge == null ||
    movie.ageRating.minAge < ticketType.blockedFromRatingAge
  );
}

function createSeatButton(doc, seat, rowLabel, selected, onToggle) {
  if (seat.state === "unavailable") {
    const gap = doc.createElement("span");
    gap.className = "booking-seat booking-seat-gap";
    gap.setAttribute("aria-hidden", "true");
    gap.dataset.seatCode = seat.code;
    return gap;
  }

  const button = doc.createElement("button");
  const isSelected = selected.has(seat.id);
  button.type = "button";
  button.className = `booking-seat is-${isSelected ? "selected" : seat.state}`;
  button.dataset.seatCode = seat.code;
  button.dataset.seatId = String(seat.id);
  button.textContent = seat.label;
  button.title = seat.code;
  button.setAttribute("aria-label", `Row ${rowLabel}, seat ${seat.code}, ${isSelected ? "selected" : seat.state}`);
  button.setAttribute("aria-pressed", String(isSelected));
  button.disabled = !isSelected && seat.state !== "available";
  button.addEventListener("click", () => onToggle(seat));
  return button;
}

function renderSeatMap(modal, seatMap, selected, onToggle) {
  const doc = modal.ownerDocument;
  const map = modal.querySelector(".booking-map");
  map.replaceChildren();

  for (const sectionData of seatMap.sections) {
    const section = doc.createElement("section");
    section.className = "booking-seat-section";
    const heading = doc.createElement("h3");
    heading.textContent = sectionData.name;
    section.append(heading);

    for (const rowData of sectionData.rows) {
      const row = doc.createElement("div");
      row.className = "booking-seat-row";
      const rowLabel = doc.createElement("span");
      rowLabel.className = "booking-row-label";
      rowLabel.textContent = rowData.label;
      const seats = doc.createElement("div");
      seats.className = "booking-row-seats";
      for (const seat of rowData.seats) {
        seats.append(createSeatButton(doc, seat, rowData.label, selected, onToggle));
        if (seat.aisleAfter) {
          const aisle = doc.createElement("span");
          aisle.className = "booking-aisle";
          aisle.setAttribute("aria-hidden", "true");
          seats.append(aisle);
        }
      }
      row.append(rowLabel, seats);
      section.append(row);
    }
    map.append(section);
  }
}

function selectedSeatList(seatMap, selected) {
  const seats = new Map();
  for (const section of seatMap.sections) {
    for (const row of section.rows) {
      for (const seat of row.seats) seats.set(seat.id, seat);
    }
  }
  return [...selected.values()].flatMap((selection) => {
    const seat = seats.get(selection.seatId);
    return seat ? [{ ...seat, ticketType: selection.ticketType }] : [];
  });
}

function renderSelectionSummary(modal, seatMap, selected, options, movie, session) {
  const doc = modal.ownerDocument;
  const list = modal.querySelector(".booking-seat-summary");
  list.replaceChildren();
  let subtotal = 0;
  const ticketTypes = options.ticketTypes.filter((type) =>
    isChildTicketAllowed(movie, type),
  );
  if (selected.size === 0) {
    const hint = doc.createElement("p");
    hint.className = "booking-empty-selection";
    hint.textContent = "Select seats from the map.";
    list.append(hint);
  }

  for (const seat of selectedSeatList(seatMap, selected)) {
    const type = ticketTypes.find((ticket) => ticket.slug === seat.ticketType);
    if (!type) continue;
    const linePrice = session.price * type.priceRatio;
    subtotal += linePrice;
    const line = doc.createElement("div");
    line.className = "booking-seat-summary-row";
    line.dataset.seatId = String(seat.id);
    const code = doc.createElement("strong");
    code.textContent = seat.code;
    const select = doc.createElement("select");
    select.className = "booking-ticket-type";
    select.setAttribute("aria-label", `Ticket type for seat ${seat.code}`);
    for (const ticketType of ticketTypes) {
      const option = doc.createElement("option");
      option.value = ticketType.slug;
      option.textContent = ticketType.name;
      if (ticketType.note) option.title = ticketType.note;
      option.selected = ticketType.slug === seat.ticketType;
      select.append(option);
    }
    select.addEventListener("change", () => {
      selected.set(seat.id, { seatId: seat.id, ticketType: select.value });
      renderSelectionSummary(modal, seatMap, selected, options, movie, session);
    });
    const price = doc.createElement("span");
    price.className = "booking-seat-price";
    price.textContent = formatMoney(linePrice);
    line.append(code, select, price);
    list.append(line);
  }

  modal.querySelector(".booking-subtotal strong").textContent = formatMoney(subtotal);
  modal.querySelector(".booking-next").disabled = selected.size === 0;
}

function renderStep(modal, step) {
  modal.dataset.step = step;
  for (const panel of modal.querySelectorAll("[data-step-panel]")) {
    panel.hidden = panel.dataset.stepPanel !== step;
  }
  for (const indicator of modal.querySelectorAll("[data-step-indicator]")) {
    indicator.classList.toggle("is-active", indicator.dataset.stepIndicator === step);
  }
  modal.querySelector(".booking-status").hidden = true;
}

function renderHoldSummary(modal, hold) {
  const doc = modal.ownerDocument;
  const summary = modal.querySelector(".booking-checkout-summary");
  summary.replaceChildren();
  for (const seat of hold.seats) {
    const line = doc.createElement("p");
    line.textContent = `${seat.code} · ${seat.ticketType.name} · ${formatMoney(seat.price)}`;
    summary.append(line);
  }
  const subtotal = doc.createElement("strong");
  subtotal.textContent = `Subtotal ${formatMoney(hold.subtotal)}`;
  summary.append(subtotal);
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function validatePayment(form, now = new Date()) {
  const values = Object.fromEntries(
    ["fullName", "email", "mobileNumber", "cardNumber", "expiry", "cvv"].map(
      (name) => [name, form.elements.namedItem(name).value.trim()],
    ),
  );
  const errors = {};
  if (values.fullName.length < 3 || values.fullName.length > 50) {
    errors.fullName = "Enter a name between 3 and 50 characters.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!/^5\d{8}$/.test(values.mobileNumber.replace(/\s/g, ""))) {
    errors.mobileNumber = "Enter a valid Georgian mobile number.";
  }
  if (!/^\d{16}$/.test(values.cardNumber.replace(/\s/g, ""))) {
    errors.cardNumber = "Enter exactly 16 card digits.";
  }
  const expiry = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(values.expiry);
  if (!expiry) {
    errors.expiry = "Enter expiry as MM/YY.";
  } else {
    const year = 2000 + Number(expiry[2]);
    const month = Number(expiry[1]);
    if (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1)) {
      errors.expiry = "Card expiry must be in the future.";
    }
  }
  if (!/^\d{3}$/.test(values.cvv)) {
    errors.cvv = "Enter exactly 3 CVV digits.";
  }
  return { values, errors };
}

function renderFieldErrors(modal, errors) {
  for (const field of modal.querySelectorAll(".booking-payment-form [name]")) {
    const message = modal.querySelector(`[data-error-for="${field.name}"]`);
    const error = errors[field.name];
    field.setAttribute("aria-invalid", String(Boolean(error)));
    message.textContent = error || "";
    message.hidden = !error;
  }
}

function renderOrder(modal, order) {
  if (!order || typeof order.reference !== "string" || !Array.isArray(order.tickets)) {
    throw new TypeError("Order response is missing confirmation details");
  }
  const doc = modal.ownerDocument;
  modal.querySelector(".booking-title").textContent = "Order confirmed";
  modal.querySelector(".booking-confirmation").hidden = false;
  modal.querySelector(".booking-seat-step").hidden = true;
  modal.querySelector(".booking-checkout-step").hidden = true;
  modal.querySelector(".booking-steps").hidden = true;
  modal.querySelector(".booking-status").hidden = true;
  modal.dataset.step = "confirmation";
  modal.querySelector(".booking-countdown").hidden = true;
  modal.querySelector(".booking-order-reference").textContent =
    `Reference ${order.reference}`;
  const details = modal.querySelector(".booking-order-details");
  details.replaceChildren();
  for (const ticket of order.tickets) {
    const line = doc.createElement("p");
    line.textContent = `${ticket.seatCode} · ${ticket.ticketType.name} · ${formatMoney(ticket.price)}`;
    details.append(line);
  }
  const total = doc.createElement("strong");
  total.textContent = `Total ${formatMoney(order.totalPrice)}`;
  details.append(total);
  const card = doc.createElement("p");
  card.textContent = `Card ending in ${order.cardLastFour}`;
  details.append(card);
  const session = doc.createElement("p");
  session.textContent =
    `${order.session.movie.title} · ${order.session.venue.name} · ${order.session.date} ${order.session.time}`;
  details.append(session);
  const contact = doc.createElement("p");
  contact.textContent =
    `${order.contact.fullName} · ${order.contact.email} · ${order.contact.mobileNumber}`;
  details.append(contact);
}

function createProfilePrompt(doc, movie, sessionId) {
  const currentSession = getAuthSession(doc.defaultView.sessionStorage);
  if (!currentSession) {
    doc.querySelector(".login-button")?.click();
    return false;
  }
  if (currentSession.user.profileComplete !== true) {
    const status = doc.querySelector("#movie-details-age-error");
    if (status) {
      status.replaceChildren(
        doc.createTextNode("Complete your profile to continue with booking. "),
      );
      const link = doc.createElement("a");
      link.href = "/pages/my-proflie.html";
      link.textContent = "Complete profile";
      status.append(link);
      status.hidden = false;
    }
    return false;
  }
  if (
    movie.ageRating.minAge > 0 &&
    (!Number.isFinite(currentSession.user.age) ||
      currentSession.user.age < movie.ageRating.minAge)
  ) {
    const status = doc.querySelector("#movie-details-age-error");
    if (status) {
      status.textContent = `This film is rated ${movie.ageRating.code}. You cannot buy tickets for it with this account.`;
      status.hidden = false;
    }
    return false;
  }
  return Boolean(sessionId);
}

/**
 * Opens a purchase modal for a specific screening from the film-details page.
 * @param {Document} doc
 * @param {number|string} sessionId
 * @param {MovieData} movie
 */
export async function openBookingModal(doc, sessionId, movie) {
  if (!sessionId || !movie) {
    throw new TypeError("A screening and film are required to open booking");
  }
  if (!createProfilePrompt(doc, movie, sessionId)) return;

  doc.querySelector(".booking-modal")?.remove();
  const modal = await loadBookingMarkup(doc);
  const loading = modal.querySelector(".booking-loading");
  doc.body.append(modal);
  const closeButton = modal.querySelector(".booking-close");
  const selection = new Map();
  let currentSession;
  let seatMap;
  let options;
  let hold = null;
  let timer;
  let requestInFlight = false;
  let pendingLoginRetry;

  function getSelectedSeats() {
    return selectedSeatList(seatMap, selection);
  }

  function updateSelection() {
    renderSeatMap(modal, seatMap, selection, toggleSeat);
    renderSelectionSummary(modal, seatMap, selection, options, movie, currentSession);
  }

  function toggleSeat(seat) {
    if (selection.has(seat.id)) {
      selection.delete(seat.id);
    } else if (selection.size >= options.maxSeatsPerOrder) {
      showStatus(
        modal,
        `Up to ${options.maxSeatsPerOrder} seats can be booked at a time.`,
      );
      return;
    } else {
      selection.set(seat.id, { seatId: seat.id, ticketType: "adult" });
    }
    showStatus(modal, "");
    updateSelection();
  }

  async function refreshSeatMap() {
    seatMap = await loadSeatMap(doc, sessionId);
    updateSelection();
  }

  async function releaseHold() {
    if (!hold?.holdId || !getAuthSession(doc.defaultView.sessionStorage)) return;
    const releasingHold = hold;
    hold = null;
    try {
      const { response } = await request(
        doc,
        `/holds/${encodeURIComponent(releasingHold.holdId)}`,
        { method: "DELETE", headers: getHeaders(doc) },
      );
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to release seat hold: ${response.status}`);
      }
    } catch (error) {
      console.error("Unable to release the seat hold:", error);
    }
  }

  function closeModal() {
    if (timer) doc.defaultView.clearInterval(timer);
    if (pendingLoginRetry) {
      doc.removeEventListener("auth:login", pendingLoginRetry);
      pendingLoginRetry = undefined;
    }
    void releaseHold();
    modal.remove();
  }

  function setStep2(held) {
    hold = held;
    renderStep(modal, "checkout");
    modal.querySelector(".booking-checkout-step").hidden = false;
    modal.querySelector(".booking-seat-step").hidden = true;
    modal.querySelector(".booking-checkout-countdown").textContent = "";
    modal.querySelector(".booking-countdown").hidden = false;
    const authSession = getAuthSession(doc.defaultView.sessionStorage);
    const form = modal.querySelector(".booking-payment-form");
    form.elements.namedItem("fullName").value = authSession.user.fullName || "";
    form.elements.namedItem("email").value = authSession.user.email || "";
    form.elements.namedItem("mobileNumber").value = authSession.user.mobileNumber || "";
    renderHoldSummary(modal, held);

    const expiresAt = Date.parse(held.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      throw new TypeError("Seat hold response is missing a valid expiry time");
    }
    if (timer) doc.defaultView.clearInterval(timer);
    const updateCountdown = () => {
      const remaining = expiresAt - Date.now();
      const time = formatCountdown(remaining);
      modal.querySelector(".booking-countdown").textContent = `Seats held · ${time}`;
      modal.querySelector(".booking-checkout-countdown").textContent = time;
      if (remaining <= 0) {
        doc.defaultView.clearInterval(timer);
        timer = undefined;
        hold = null;
        selection.clear();
        renderStep(modal, "seats");
        showStatus(modal, "Your hold time expired. Please re-select your seats.");
        refreshSeatMap().catch((error) => {
          console.error(error);
          showStatus(modal, "The seat map could not be refreshed. Please retry.");
        });
      }
    };
    updateCountdown();
    timer = doc.defaultView.setInterval(updateCountdown, 1000);
  }

  async function reconcileContested(contested, message) {
    if (timer) doc.defaultView.clearInterval(timer);
    timer = undefined;
    hold = null;
    const lostCodes = Array.isArray(contested) ? contested : [];
    for (const code of lostCodes) {
      for (const section of seatMap.sections) {
        for (const row of section.rows) {
          const seat = row.seats.find((item) => item.code === code);
          if (seat) {
            selection.delete(seat.id);
            seat.state = "sold";
          }
        }
      }
    }
    renderStep(modal, "seats");
    showStatus(
      modal,
      lostCodes.length
        ? `${message || "Some seats were just taken."} Unavailable: ${lostCodes.join(", ")}.`
        : message || "Some seats were just taken.",
    );
    await refreshSeatMap();
    for (const code of lostCodes) {
      for (const section of seatMap.sections) {
        for (const row of section.rows) {
          const seat = row.seats.find((item) => item.code === code);
          if (seat) seat.state = "sold";
        }
      }
    }
    updateSelection();
  }

  async function handleBookingResponse(response, payload, action) {
    if (response.status === 409) {
      await reconcileContested(payload?.contested, payload?.message);
      return false;
    }
    if (response.status === 422) {
      if (payload?.errors && typeof payload.errors === "object") {
        if (action === "order") renderFieldErrors(modal, payload.errors);
        const errors = Object.values(payload.errors).flat().filter((value) => typeof value === "string");
        showStatus(modal, errors.join(" ") || payload.message || "Please review your selection.");
      } else if (String(payload?.message || "").toLowerCase().includes("profile")) {
        showStatus(modal, payload.message, "error");
        const link = doc.createElement("a");
        link.href = "/pages/my-proflie.html";
        link.textContent = "Complete your profile";
        modal.querySelector(".booking-status").append(" ", link);
      } else if (action === "order" && String(payload?.message || "").toLowerCase().includes("hold")) {
        if (timer) doc.defaultView.clearInterval(timer);
        timer = undefined;
        hold = null;
        selection.clear();
        renderStep(modal, "seats");
        showStatus(modal, payload.message);
        await refreshSeatMap();
      } else {
        showStatus(modal, payload?.message || "This booking cannot be completed.", "error");
      }
      return false;
    }
    if (response.status === 403) {
      showStatus(modal, "This seat hold belongs to another account.", "error");
      return false;
    }
    if (response.status === 401) {
      showStatus(modal, "Log in to continue booking.", "error");
      return false;
    }
    if (!response.ok) {
      throw new Error(`${action === "hold" ? "Seat hold" : "Order"} failed: ${response.status}`);
    }
    return true;
  }

  async function placeHold() {
    if (requestInFlight || selection.size === 0) return;
    requestInFlight = true;
    const nextButton = modal.querySelector(".booking-next");
    nextButton.disabled = true;
    showStatus(modal, "");
    try {
      const body = {
        seats: [...selection.values()].map(({ seatId, ticketType }) => ({
          seatId,
          ticketType,
        })),
      };
      pendingLoginRetry = () => {
        doc.removeEventListener("auth:login", pendingLoginRetry);
        pendingLoginRetry = undefined;
        void placeHold();
      };
      doc.addEventListener("auth:login", pendingLoginRetry, { once: true });
      const { response, payload } = await request(
        doc,
        `/sessions/${encodeURIComponent(sessionId)}/holds`,
        {
          method: "POST",
          headers: getHeaders(doc, true),
          body: JSON.stringify(body),
        },
      );
      if (response.status !== 401) {
        doc.removeEventListener("auth:login", pendingLoginRetry);
        pendingLoginRetry = undefined;
      }
      if (!(await handleBookingResponse(response, payload, "hold"))) return;
      const newHold = payload?.data;
      if (
        !newHold ||
        typeof newHold.holdId !== "string" ||
        typeof newHold.expiresAt !== "string" ||
        !Array.isArray(newHold.seats) ||
        typeof newHold.subtotal !== "number"
      ) {
        throw new TypeError("Seat hold response is missing required reservation details");
      }
      setStep2(newHold);
    } catch (error) {
      console.error("Unable to hold the selected seats:", error);
      showStatus(modal, "Unable to reserve these seats. Please try again.", "error");
    } finally {
      requestInFlight = false;
      if (modal.isConnected && modal.dataset.step === "seats") {
        nextButton.disabled = selection.size === 0;
      }
    }
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (requestInFlight || !hold) return;
    const form = modal.querySelector(".booking-payment-form");
    const validation = validatePayment(form);
    renderFieldErrors(modal, validation.errors);
    if (Object.keys(validation.errors).length > 0) {
      showStatus(modal, "Please correct the highlighted fields.", "error");
      return;
    }

    requestInFlight = true;
    const submit = modal.querySelector(".booking-pay");
    submit.disabled = true;
    submit.textContent = "Processing…";
    showStatus(modal, "");
    const submittedHold = hold;
    try {
      const { values } = validation;
      const body = {
        holdId: submittedHold.holdId,
        fullName: values.fullName,
        email: values.email,
        mobileNumber: values.mobileNumber,
        cardNumber: values.cardNumber,
        expiry: values.expiry,
        cvv: values.cvv,
      };
      pendingLoginRetry = () => {
        doc.removeEventListener("auth:login", pendingLoginRetry);
        pendingLoginRetry = undefined;
        void submitOrder(new doc.defaultView.Event("submit", { cancelable: true }));
      };
      doc.addEventListener("auth:login", pendingLoginRetry, { once: true });
      const { response, payload } = await request(doc, "/orders", {
        method: "POST",
        headers: getHeaders(doc, true),
        body: JSON.stringify(body),
      });
      if (response.status !== 401) {
        doc.removeEventListener("auth:login", pendingLoginRetry);
        pendingLoginRetry = undefined;
      }
      if (!(await handleBookingResponse(response, payload, "order"))) return;
      renderOrder(modal, payload?.data);
      hold = null;
      if (timer) doc.defaultView.clearInterval(timer);
      timer = undefined;
    } catch (error) {
      console.error("Unable to complete the order:", error);
      showStatus(modal, "Unable to complete the order. Please try again.", "error");
    } finally {
      requestInFlight = false;
      if (submit.isConnected && modal.dataset.step !== "confirmation") {
        submit.disabled = false;
        submit.textContent = "Pay & Complete Order";
      }
    }
  }

  closeButton.addEventListener("click", closeModal);
  modal.querySelector(".booking-confirmation-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
  modal.querySelector(".booking-next").addEventListener("click", placeHold);
  modal.querySelector(".booking-back").addEventListener("click", () => {
    renderStep(modal, "seats");
    showStatus(modal, "");
    modal.querySelector(".booking-next").disabled = selection.size === 0;
  });
  modal.querySelector(".booking-payment-form").addEventListener("submit", submitOrder);

  try {
    [currentSession, seatMap, options] = await Promise.all([
      loadSession(doc, sessionId),
      loadSeatMap(doc, sessionId),
      loadFilterOptions(doc),
    ]);
    const sessionMovie = currentSession.movie;
    if (
      movie.ageRating?.minAge !== sessionMovie.ageRating?.minAge ||
      movie.id !== sessionMovie.id
    ) {
      throw new TypeError("Selected screening does not belong to this film");
    }
    modal.querySelector(".booking-title").textContent = sessionMovie.title;
    modal.querySelector(".booking-session-meta").textContent =
      `${currentSession.venue.name} · Hall ${currentSession.hall.name} · ${displayDate(currentSession, doc)} · ${currentSession.time} · ${currentSession.format.name} · ${currentSession.language.name}`;
    modal.querySelector(".booking-seat-cap").textContent =
      `· Max ${options.maxSeatsPerOrder}`;
    modal.querySelector(".booking-seat-cap-copy").textContent =
      String(options.maxSeatsPerOrder);
    const screen = doc.createElement("div");
    screen.className = "booking-screen";
    screen.textContent = "SCREEN";
    modal.querySelector(".booking-map").before(screen);
    for (const section of seatMap.sections) {
      for (const row of section.rows) {
        for (const seat of row.seats) {
          if (seat.isMine) {
            selection.set(seat.id, { seatId: seat.id, ticketType: "adult" });
          }
        }
      }
    }
    updateSelection();
    loading.hidden = true;
    modal.querySelector(".booking-seat-step").hidden = false;
    modal.querySelector(".booking-close").focus();
  } catch (error) {
    console.error("Unable to open the booking modal:", error);
    loading.textContent = "The booking details could not be loaded. Close this window and try again.";
    showStatus(modal, "Unable to load this screening.", "error");
  }
}
