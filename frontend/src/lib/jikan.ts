// Jikan API client. Goes through our backend proxy so we get caching + stale-on-error.
const RAW_BASE = (import.meta.env.REACT_APP_BACKEND_URL as string) || "";
const BASE = `${RAW_BASE}/api/jikan`;

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
      (j: { data?: { mal_id: number; name: string; count?: number }[] }) => j?.data || [],
    ).catch(() => [] as { mal_id: number; name: string; count?: number }[]),
};
