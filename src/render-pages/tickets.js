import { getAuthSession } from "../Auth/auth-session.js";
import { fetchTickets, refundOrder } from "../API/tickets.js";

function formatSessionDate(session, doc) {
  const date = new Date(`${session.date}T12:00:00`);
  return new doc.defaultView.Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function renderOrder(doc, order, onRefund) {
  const card = doc.createElement("article");
  card.className = "ticket-order-card";
  card.dataset.orderReference = order.reference;

  const heading = doc.createElement("header");
  const title = doc.createElement("h3");
  title.textContent = order.session.movie.title;
  const status = doc.createElement("span");
  status.className = `ticket-order-status is-${order.status}`;
  status.textContent = order.status === "refunded" ? "Refunded" : "Paid";
  heading.append(title, status);

  const session = doc.createElement("p");
  session.className = "ticket-order-session";
  session.textContent = `${order.session.venue.name} · Hall ${order.session.hall.name} · ${formatSessionDate(order.session, doc)} · ${order.session.time}`;

  const tickets = doc.createElement("ul");
  tickets.className = "ticket-order-seats";
  for (const ticket of order.tickets) {
    const item = doc.createElement("li");
    item.textContent = `${ticket.seatCode} · ${ticket.ticketType.name} · ₾${ticket.price}`;
    tickets.append(item);
  }

  const footer = doc.createElement("footer");
  const reference = doc.createElement("span");
  reference.textContent = `Order ${order.reference}`;
  const total = doc.createElement("strong");
  total.textContent = `Total ₾${order.totalPrice}`;
  footer.append(reference, total);
  card.append(heading, session, tickets, footer);

  if (order.isUpcoming && order.isRefundable && order.status !== "refunded") {
    const refund = doc.createElement("button");
    refund.type = "button";
    refund.className = "ticket-refund-button";
    refund.textContent = "Request refund";
    refund.addEventListener("click", () => onRefund(order, refund));
    card.append(refund);
  } else if (order.isUpcoming && order.status !== "refunded") {
    const unavailable = doc.createElement("button");
    unavailable.type = "button";
    unavailable.className = "ticket-refund-button";
    unavailable.disabled = true;
    unavailable.title = "Refunds are unavailable within two hours of the session.";
    unavailable.textContent = "Refund unavailable";
    card.append(unavailable);
  }
  return card;
}

export function initializeTickets(doc = document) {
  const panel = doc.querySelector("#tickets-panel");
  const profileTab = doc.querySelector("#profile-tab");
  const ticketsTab = doc.querySelector("#tickets-tab");
  const profilePanel = doc.querySelector("#profile-panel");
  if (!panel || !profileTab || !ticketsTab || panel.dataset.initialized === "true") {
    return;
  }
  panel.dataset.initialized = "true";
  panel.replaceChildren();

  const heading = doc.createElement("h2");
  heading.textContent = "My Tickets";
  const tabs = doc.createElement("div");
  tabs.className = "ticket-filter-tabs";
  tabs.setAttribute("role", "tablist");
  const upcomingTab = doc.createElement("button");
  upcomingTab.type = "button";
  upcomingTab.role = "tab";
  upcomingTab.dataset.ticketFilter = "upcoming";
  upcomingTab.textContent = "Upcoming";
  const pastTab = doc.createElement("button");
  pastTab.type = "button";
  pastTab.role = "tab";
  pastTab.dataset.ticketFilter = "past";
  pastTab.textContent = "Past";
  tabs.append(upcomingTab, pastTab);

  const status = doc.createElement("p");
  status.className = "tickets-status";
  status.setAttribute("role", "status");
  status.hidden = true;
  const list = doc.createElement("div");
  list.className = "ticket-orders";
  panel.append(heading, tabs, status, list);

  let selectedFilter = "upcoming";
  let requestId = 0;
  const ticketCache = { upcoming: [], past: [] };

  function setStatus(message, error = false) {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("is-error", error);
  }

  function renderOrders(orders) {
    list.replaceChildren();
    if (orders.length === 0) {
      const empty = doc.createElement("p");
      empty.className = "tickets-empty";
      empty.textContent = selectedFilter === "upcoming"
        ? "You have no upcoming tickets."
        : "You have no past tickets.";
      list.append(empty);
      return;
    }
    for (const order of orders) {
      list.append(renderOrder(doc, order, submitRefund));
    }
  }

  async function loadTickets(filter) {
    selectedFilter = filter;
    upcomingTab.setAttribute("aria-selected", String(filter === "upcoming"));
    pastTab.setAttribute("aria-selected", String(filter === "past"));
    const currentRequest = ++requestId;
    setStatus("Loading tickets…");
    try {
      const orders = await fetchTickets(filter, doc);
      if (currentRequest !== requestId) return;
      ticketCache[filter] = orders;
      renderOrders(orders);
      setStatus("");
    } catch (error) {
      if (currentRequest !== requestId) return;
      console.error("Unable to load tickets:", error);
      setStatus(
        error.message || "Unable to load your tickets. Please try again.",
        true,
      );
    }
  }

  async function submitRefund(order, button) {
    if (!order.isRefundable || !doc.defaultView.confirm(
      `Refund order ${order.reference}? This action cannot be undone.`,
    )) return;
    button.disabled = true;
    setStatus("");
    try {
      const updatedOrder = await refundOrder(order.reference, doc);
      ticketCache.upcoming = ticketCache.upcoming.filter(
        (ticket) => ticket.reference !== updatedOrder.reference,
      );
      ticketCache.past = [
        updatedOrder,
        ...ticketCache.past.filter(
          (ticket) => ticket.reference !== updatedOrder.reference,
        ),
      ];
      setStatus(`Order ${updatedOrder.reference} was refunded.`);
      if (selectedFilter === "upcoming") {
        selectedFilter = "past";
        upcomingTab.setAttribute("aria-selected", "false");
        pastTab.setAttribute("aria-selected", "true");
      }
      renderOrders(ticketCache.past);
    } catch (error) {
      console.error("Unable to refund order:", error);
      setStatus(
        error.payload?.message || error.message || "Unable to refund this order.",
        true,
      );
      button.disabled = false;
    }
  }

  upcomingTab.addEventListener("click", () => void loadTickets("upcoming"));
  pastTab.addEventListener("click", () => void loadTickets("past"));
  doc.addEventListener("auth:login", () => {
    upcomingTab.disabled = false;
    pastTab.disabled = false;
    void loadTickets("upcoming");
  });
  const clearTickets = () => {
    upcomingTab.disabled = true;
    pastTab.disabled = true;
    ticketCache.upcoming = [];
    ticketCache.past = [];
    list.replaceChildren();
    setStatus("Log in to view your tickets.", true);
  };
  doc.addEventListener("auth:logout", clearTickets);
  doc.addEventListener("auth:unauthorized", clearTickets);
  profileTab.addEventListener("click", () => {
    panel.hidden = true;
    profilePanel.hidden = false;
    profileTab.classList.add("active");
    ticketsTab.classList.remove("active");
    profileTab.setAttribute("aria-selected", "true");
    ticketsTab.setAttribute("aria-selected", "false");
  });
  ticketsTab.addEventListener("click", () => {
    panel.hidden = false;
    profilePanel.hidden = true;
    profileTab.classList.remove("active");
    ticketsTab.classList.add("active");
    profileTab.setAttribute("aria-selected", "false");
    ticketsTab.setAttribute("aria-selected", "true");
    void loadTickets(selectedFilter);
  });

  if (!getAuthSession(doc.defaultView.sessionStorage)) {
    setStatus("Log in to view your tickets.", true);
    upcomingTab.disabled = true;
    pastTab.disabled = true;
    return;
  }
}

if (typeof document !== "undefined") {
  initializeTickets();
}
