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
