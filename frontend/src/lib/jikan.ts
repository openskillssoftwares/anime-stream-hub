// Jikan API client. Goes through our backend proxy so we get caching + stale-on-error.
const RAW_BASE = (import.meta.env.VITE_BACKEND_URL as string) || "";
const BASE = `${RAW_BASE}/api/jikan`;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export const rankSearchResults = (items: Anime[], query: string): Anime[] => {
  const q = normalize(query);
  if (!q) return items;
  const tokens = q.split(" ").filter(Boolean);

  const score = (anime: Anime) => {
    const title = normalize(anime.title_english || anime.title || "");
    const exact = title === q ? 1000 : 0;
    const starts = title.startsWith(q) ? 500 : 0;
    const wordHits = tokens.reduce((acc, token) => acc + (title.includes(token) ? 20 : 0), 0);
    const fuzzy = tokens.reduce((acc, token) => acc + (title.includes(token) ? 1 : 0), 0);
    const meta = (anime.score || 0) + (anime.episodes || 0) * 0.01 + (anime.year || 0) * 0.0001;
    return exact + starts + wordHits + fuzzy + meta;
  };

  return [...items].sort((a, b) => score(b) - score(a));
};

export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images: { jpg: { large_image_url: string; image_url: string } };
  score?: number | null;
  episodes?: number | null;
  year?: number | null;
  type?: string | null;
  status?: string | null;
  synopsis?: string | null;
  genres?: { name: string }[];
  trailer?: { youtube_id?: string | null; embed_url?: string | null } | null;
  rank?: number | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  return res.json();
}

const safeList = async (path: string): Promise<Anime[]> => {
  try {
    const r = await get<{ data: Anime[] }>(path);
    return Array.isArray(r?.data) ? r.data : [];
  } catch {
    return [];
  }
};

export const jikan = {
  topAiring: () => safeList("/top/anime?filter=airing&limit=12"),
  topAll: () => safeList("/top/anime?limit=10"),
  seasonNow: () => safeList("/seasons/now?limit=18"),
  upcoming: () => safeList("/seasons/upcoming?limit=12"),
  newReleases: () => safeList("/anime?order_by=start_date&sort=desc&status=airing&sfw=true&limit=14"),
  search: (q: string) => safeList(`/anime?q=${encodeURIComponent(q)}&limit=24&sfw=true`),
  byGenre: (genreId: number, page = 1) =>
    safeList(`/anime?genres=${genreId}&order_by=score&sort=desc&sfw=true&limit=24&page=${page}`),
  byFilters: (params: { type?: string; status?: string; rating?: string;
                         genres?: number[]; order_by?: string; sort?: string;
                         q?: string; page?: number; limit?: number }) => {
    const u = new URLSearchParams();
    if (params.q) u.set("q", params.q);
    if (params.type) u.set("type", params.type);
    if (params.status) u.set("status", params.status);
    if (params.rating) u.set("rating", params.rating);
    if (params.genres && params.genres.length) u.set("genres", params.genres.join(","));
    u.set("order_by", params.order_by || "score");
    u.set("sort", params.sort || "desc");
    u.set("sfw", "true");
    u.set("limit", String(params.limit || 24));
    u.set("page", String(params.page || 1));
    return safeList(`/anime?${u.toString()}`);
  },
  byId: async (id: number | string): Promise<Anime | null> => {
    try {
      const r = await get<{ data: Anime }>(`/anime/${id}/full`);
      return r?.data || null;
    } catch {
      return null;
    }
  },
  episodes: async (id: number | string) => {
    try {
      const r = await get<{ data: { mal_id: number; title: string; aired?: string }[] }>(`/anime/${id}/episodes`);
      return Array.isArray(r?.data) ? r.data : [];
    } catch {
      return [];
    }
  },
  genres: () =>
    fetch(`${BASE}/genres/anime`).then((r) => r.json()).then(
      (j: { data?: { mal_id: number; name: string; count?: number }[] }) => {
        const list = j?.data || [];
        return list.length > 0 ? list : FALLBACK_GENRES;
      },
    ).catch(() => FALLBACK_GENRES),
};

// Hard-coded list of common MAL genre IDs as a resilience fallback for when
// Jikan returns 500 and AniList GraphQL doesn't expose Jikan-compatible IDs.
const FALLBACK_GENRES: { mal_id: number; name: string }[] = [
  { mal_id: 1, name: "Action" },
  { mal_id: 2, name: "Adventure" },
  { mal_id: 4, name: "Comedy" },
  { mal_id: 8, name: "Drama" },
  { mal_id: 10, name: "Fantasy" },
  { mal_id: 14, name: "Horror" },
  { mal_id: 7, name: "Mystery" },
  { mal_id: 22, name: "Romance" },
  { mal_id: 24, name: "Sci-Fi" },
  { mal_id: 36, name: "Slice of Life" },
  { mal_id: 30, name: "Sports" },
  { mal_id: 37, name: "Supernatural" },
  { mal_id: 41, name: "Suspense" },
  { mal_id: 27, name: "Shounen" },
  { mal_id: 25, name: "Shoujo" },
  { mal_id: 42, name: "Seinen" },
  { mal_id: 43, name: "Josei" },
  { mal_id: 18, name: "Mecha" },
  { mal_id: 38, name: "Military" },
  { mal_id: 19, name: "Music" },
  { mal_id: 40, name: "Psychological" },
  { mal_id: 17, name: "Martial Arts" },
  { mal_id: 23, name: "School" },
  { mal_id: 62, name: "Isekai" },
];
