import {fetchFeaturedMovies} from '../API/movies.js';
import {fetchNowPlayingMovies} from '../API/movies.js';
import {fetchComingSoonMovies} from '../API/movies.js';
interface MovieWithSynopsisData extends MovieData {
  synopsis: string;
}

interface MovieDetailData extends MovieWithSynopsisData {
  director: string[];
  cast: string[];
  availableDates: string[];
}

interface ageRating {
  code: string;
  minAge: number;
  description: string;
}

interface Genre {
  id: number;
  slug: string;
  name: string;
}

interface format {
  id: number;
  slug: string;
  name: string;
  priceUplift: number;
}

interface MovieData {
  id: number;
  slug: string;
  title: string;
  kind: string;
  runtimeMinutes: number;
  posterUrl: string;
  backdropUrl: string;
  releaseDate: string;
  isComingSoon: boolean;
  isFeatured: boolean;
  fromPrice: number;
  ageRating: ageRating;
  genres: Genre[];
  formats: format[];
}

