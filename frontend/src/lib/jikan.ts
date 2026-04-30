// Jikan API client (unofficial MAL API) — free, no auth needed.
const BASE = "https://api.jikan.moe/v4";

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

export const jikan = {
  topAiring: () => get<{ data: Anime[] }>("/top/anime?filter=airing&limit=12").then(r => r.data),
  topAll: () => get<{ data: Anime[] }>("/top/anime?limit=10").then(r => r.data),
  seasonNow: () => get<{ data: Anime[] }>("/seasons/now?limit=18").then(r => r.data),
  upcoming: () => get<{ data: Anime[] }>("/seasons/upcoming?limit=12").then(r => r.data),
  search: (q: string) => get<{ data: Anime[] }>(`/anime?q=${encodeURIComponent(q)}&limit=24&sfw=true`).then(r => r.data),
  byId: (id: number | string) => get<{ data: Anime }>(`/anime/${id}/full`).then(r => r.data),
  episodes: (id: number | string) => get<{ data: { mal_id: number; title: string; aired?: string }[] }>(`/anime/${id}/episodes`).then(r => r.data),
};
