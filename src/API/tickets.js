import {
  getAuthSession,
  handleUnauthorizedResponse,
} from "../Auth/auth-session.js";

const API_BASE = "https://api.kinoxii.redberryinternship.ge/api";

function authHeaders(doc) {
  const session = getAuthSession(doc.defaultView.sessionStorage);
  if (!session) throw new Error("Authentication is required.");
  return {
    Accept: "application/json",
    Authorization: `******`,
  };
}

async function readData(response, doc, context) {
  handleUnauthorizedResponse(response, doc);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.message || `${context} failed (${response.status}).`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  const payload = await response.json();
  if (!("data" in (payload || {}))) {
    throw new TypeError(`${context} response did not contain data.`);
  }
  return payload.data;
}

/**
 * @param {"upcoming"|"past"|undefined} filter
 * @param {Document} [doc]
 * @returns {Promise<import("../models/movie-interfaces").OrderData[]>}
 */
export async function fetchTickets(filter, doc = document) {
  const url = new URL(`${API_BASE}/tickets`);
  if (filter) url.searchParams.set("filter", filter);
  const response = await doc.defaultView.fetch(url, {
    headers: authHeaders(doc),
  });
  const data = await readData(response, doc, "Loading tickets");
  if (!Array.isArray(data)) {
    throw new TypeError("Tickets response data must be an array.");
  }
  return data;
}

/**
 * @param {string} holdId
 * @param {Document} [doc]
 * @returns {Promise<import("../models/movie-interfaces").SeatHold>}
 */
export async function fetchHold(holdId, doc = document) {
  if (!holdId) throw new TypeError("A hold ID is required.");
  const response = await doc.defaultView.fetch(
    `${API_BASE}/holds/${encodeURIComponent(holdId)}`,
    { headers: authHeaders(doc) },
  );
  return readData(response, doc, "Loading seat hold");
}

/**
 * @param {string|number} orderId
 * @param {Document} [doc]
 * @returns {Promise<import("../models/movie-interfaces").OrderData>}
 */
export async function refundOrder(orderId, doc = document) {
  if (!orderId) throw new TypeError("An order reference is required.");
  const response = await doc.defaultView.fetch(
    `${API_BASE}/orders/${encodeURIComponent(orderId)}/refund`,
    {
      method: "POST",
      headers: authHeaders(doc),
    },
  );
  return readData(response, doc, "Refunding order");
}
