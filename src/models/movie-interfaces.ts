export interface MovieWithSynopsisData extends MovieData {
  synopsis: string;
}

export interface MovieDetailData extends MovieWithSynopsisData {
  director: string;
  cast: string;
  availableDates: string[];
}

export interface RecentlyViewedMovie extends MovieData {
  viewedAt: string;
}

export interface MovieNotificationResponse {
  data: {
    movieId: number;
    subscribed: true;
  };
}

export interface MovieSession {
  id: number;
  startsAt: string;
  date: string;
  time: string;
  timeBand: "morning" | "afternoon" | "evening";
  price: number;
  seatsLeft: number;
  isSoldOut: boolean;
  hall: { id: number; name: string };
  venue: VenueData;
  format: MovieFormat;
  language: SessionLanguage;
}

export interface MovieVenueSessions {
  venue: VenueData;
  sessions: MovieSession[];
}

export interface AgeRating {
  code: string;
  minAge: number;
  description: string;
}

export interface Genre {
  id: number;
  slug: string;
  name: string;
}

export interface MovieFormat {
  id: number;
  slug: string;
  name: string;
  priceUplift: number;
}

export interface VenueData {
  id: number;
  slug: string;
  name: string;
  city: string;
  formats?: MovieFormat[];
}

export interface SessionLanguage {
  id: number;
  slug: string;
  name: string;
  code: string;
}

export interface SessionData {
  id: number;
  startsAt: string;
  date: string;
  time: string;
  timeBand: "morning" | "afternoon" | "evening";
  price: number;
  seatsLeft: number;
  isSoldOut: boolean;
  hall: {
    id: number;
    name: string;
    venue: VenueData;
  };
  venue: VenueData;
  format: MovieFormat;
  language: SessionLanguage;
  movie: MovieData;
}

export type SeatState = "available" | "sold" | "held" | "unavailable";
export type TicketTypeSlug = "adult" | "child" | "student";

export interface TicketType {
  id: number;
  slug: TicketTypeSlug;
  name: string;
  priceRatio: number;
  note: string | null;
  blockedFromRatingAge: number | null;
}

export interface SeatData {
  id: number;
  code: string;
  label: string;
  state: SeatState;
  aisleAfter: boolean;
  isMine: boolean;
}

export interface SeatRow {
  label: string;
  seats: SeatData[];
}

export interface SeatSection {
  name: string;
  rows: SeatRow[];
}

export interface SeatMap {
  sessionId: number;
  hall: {
    id: number;
    name: string;
    venue: VenueData;
  };
  sections: SeatSection[];
}

export interface BookingFilterOptions {
  ticketTypes: TicketType[];
  maxSeatsPerOrder: number;
  holdMinutes: number;
}

export interface SeatHold {
  holdId: string;
  sessionId: number;
  expiresAt: string;
  secondsRemaining: number;
  isLive: boolean;
  subtotal: number;
  seats: Array<{
    seatId: number;
    code: string;
    ticketType: { slug: TicketTypeSlug; name: string };
    price: number;
  }>;
}

export interface OrderData {
  id: number;
  reference: string;
  status: "paid" | "refunded";
  totalPrice: number;
  paidAt: string;
  refundedAt: string | null;
  isUpcoming: boolean;
  isRefundable: boolean;
  cardLastFour: string;
  contact: {
    fullName: string;
    email: string;
    mobileNumber: string;
  };
  session: SessionData;
  tickets: Array<{
    id: number;
    seatCode: string;
    ticketType: { slug: TicketTypeSlug; name: string };
    price: number;
  }>;
}

export interface BookingOptionsResponse {
  data: BookingFilterOptions;
}

export interface SeatMapResponse {
  data: SeatMap;
}

export interface SeatHoldResponse {
  data: SeatHold;
}

export interface OrderResponse {
  data: OrderData;
}

export interface MovieSessionGroup {
  movie: MovieData;
  sessions: SessionData[];
}

export interface SessionsPagination {
  currentPage: number;
  lastPage: number;
  perPage: number;
  totalSessions: number;
  totalMovies: number;
  date: string;
}

export interface SessionsResponse {
  data: MovieSessionGroup[];
  meta: SessionsPagination;
}

export interface SessionsFilters {
  date?: string;
  venues?: string[];
  formats?: string[];
  languages?: string[];
  bands?: Array<SessionData["timeBand"]>;
  search?: string;
  sort?: "time_asc" | "time_desc" | "price_asc" | "price_desc" | "title_asc";
  page?: number;
}

export interface MovieData {
  id: number;
  slug: string;
  title: string;
  kind: string;
  runtimeMinutes: number;
  posterUrl: string;
  backdropUrl: string;
  releaseDate: string;
  isComingSoon: boolean;
  isNotified?: boolean;
  isFeatured: boolean;
  fromPrice: number;
  ageRating: AgeRating;
  genres: Genre[];
  formats: MovieFormat[];
}
