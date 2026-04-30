// MAL helpers via Jikan (read-only public lists)
import type { Anime } from "./jikan";

const BASE = "https://api.jikan.moe/v4";

export interface MalListEntry {
  mal_id: number;
  title: string;
  image_url: string;
  status: string;       // Watching | Completed | On-Hold | Dropped | Plan to Watch
  score: number;        // 0..10
  episodes_watched: number;
  total_episodes: number | null;
}

const STATUS_MAP: Record<string, "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch"> = {
  "Watching": "watching",
  "Completed": "completed",
  "On-Hold": "on_hold",
  "Dropped": "dropped",
  "Plan to Watch": "plan_to_watch",
};

export const toDbStatus = (mal: string) => STATUS_MAP[mal] ?? "plan_to_watch";

const STATUS_TO_MAL: Record<string, string> = {
  watching: "1",
  completed: "2",
  on_hold: "3",
  dropped: "4",
  plan_to_watch: "6",
};

// Fetch full public anime list for a MAL username (paginated by Jikan, 300/page)
export async function fetchMalList(username: string): Promise<MalListEntry[]> {
  const all: MalListEntry[] = [];
  let page = 1;
  // safety cap to avoid runaway loops
  while (page <= 20) {
    const res = await fetch(`${BASE}/users/${encodeURIComponent(username)}/animelist?page=${page}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`MAL user "${username}" not found or list is private.`);
      throw new Error(`Failed to fetch MAL list (${res.status})`);
    }
    const json = await res.json();
    const data = (json.data ?? []) as Array<{
      anime: { mal_id: number; title: string; images: { jpg: { image_url: string } }; episodes: number | null };
      watching_status: number;
      score: number;
      episodes_watched: number;
    }>;
    if (!data.length) break;
    for (const item of data) {
      const statusName = ["", "Watching", "Completed", "On-Hold", "Dropped", "", "Plan to Watch"][item.watching_status] || "Plan to Watch";
      all.push({
        mal_id: item.anime.mal_id,
        title: item.anime.title,
        image_url: item.anime.images.jpg.image_url,
        status: statusName,
        score: item.score,
        episodes_watched: item.episodes_watched,
        total_episodes: item.anime.episodes,
      });
    }
    if (data.length < 300) break;
    page++;
    // Jikan is rate-limited to 3 req/sec — small delay
    await new Promise(r => setTimeout(r, 400));
  }
  return all;
}

// Build a MAL-compatible XML export from watchlist rows
export function buildMalXml(rows: Array<{
  mal_id: number;
  title: string;
  status: string;
  score: number | null;
  episodes_watched: number;
  total_episodes: number | null;
}>): string {
  const escape = (s: string) => s.replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
  const items = rows.map(r => `
  <anime>
    <series_animedb_id>${r.mal_id}</series_animedb_id>
    <series_title><![CDATA[${r.title}]]></series_title>
    <series_episodes>${r.total_episodes ?? 0}</series_episodes>
    <my_watched_episodes>${r.episodes_watched}</my_watched_episodes>
    <my_score>${r.score ?? 0}</my_score>
    <my_status>${STATUS_TO_MAL[r.status] ?? "6"}</my_status>
    <update_on_import>1</update_on_import>
  </anime>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" ?>
<myanimelist>
  <myinfo>
    <user_export_type>1</user_export_type>
  </myinfo>${items}
</myanimelist>`;
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
