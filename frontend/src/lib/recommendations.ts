import type { Anime } from "@/lib/jikan";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export interface RecommendationContext {
  watchedGenres?: string[];
  watchedTitles?: string[];
  favoriteTypes?: string[];
}

export const dedupeAnime = (items: Anime[]): Anime[] => {
  const seen = new Set<number>();
  const out: Anime[] = [];
  for (const a of items) {
    if (!a?.mal_id || seen.has(a.mal_id)) continue;
    seen.add(a.mal_id);
    out.push(a);
  }
  return out;
};

const localRank = (a: Anime) => {
  const score = a.score || 0;
  const eps = a.episodes || 0;
  const hasEng = a.title_english ? 0.15 : 0;
  const yearBonus = a.year ? Math.max(0, (a.year - 2010) / 100) : 0;
  return score + Math.min(eps, 26) * 0.02 + hasEng + yearBonus;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const localRecommendations = (
  items: Anime[],
  count = 6,
  context: RecommendationContext = {},
): Anime[] => {
  const watchedGenres = new Set((context.watchedGenres || []).map(normalize));
  const watchedTypes = new Set((context.favoriteTypes || []).map(normalize));
  const watchedTitles = new Set((context.watchedTitles || []).map(normalize));

  return dedupeAnime(items)
    .filter((anime) => !watchedTitles.has(normalize(anime.title_english || anime.title || "")))
    .sort((a, b) => {
      const scoreFor = (anime: Anime) => {
        let score = localRank(anime);
        const genreHits = (anime.genres || []).reduce((acc, genre) => acc + (watchedGenres.has(normalize(genre.name)) ? 1 : 0), 0);
        const typeHit = anime.type && watchedTypes.has(normalize(anime.type)) ? 1 : 0;
        score += genreHits * 1.2 + typeHit * 0.6;
        return score;
      };
      return scoreFor(b) - scoreFor(a);
    })
    .slice(0, count);
};

const parseJsonArray = (text: string): number[] => {
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) return arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  } catch {
    // ignore and try regex extraction below
  }
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]);
    if (Array.isArray(arr)) return arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
  return [];
};

export const aiRecommendations = async (
  items: Anime[],
  count = 6,
  context: RecommendationContext = {},
): Promise<Anime[]> => {
  const unique = dedupeAnime(items);
  if (!GEMINI_KEY || unique.length === 0) return localRecommendations(unique, count, context);

  const source = unique.slice(0, 30).map((a) => ({
    mal_id: a.mal_id,
    title: a.title_english || a.title,
    score: a.score || 0,
    year: a.year || null,
    type: a.type || null,
  }));

  const prompt = [
    "Pick unique MAL IDs for best personalized anime recommendations.",
    `Return ONLY a JSON array with ${count} numeric MAL IDs, no markdown, no text.`,
    "Prioritize variety and quality, avoid duplicates.",
    context.watchedGenres?.length ? `Watched genres: ${context.watchedGenres.join(", ")}` : "",
    context.watchedTitles?.length ? `Recently watched titles: ${context.watchedTitles.join(", ")}` : "",
    context.favoriteTypes?.length ? `Preferred types: ${context.favoriteTypes.join(", ")}` : "",
    `Candidates: ${JSON.stringify(source)}`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 180 },
        }),
      },
    );

    if (!res.ok) return localRecommendations(unique, count, context);
    const payload = await res.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const ids = parseJsonArray(String(text));
    if (!ids.length) return localRecommendations(unique, count, context);

    const map = new Map(unique.map((a) => [a.mal_id, a]));
    const picked: Anime[] = [];
    const seen = new Set<number>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      const hit = map.get(id);
      if (!hit) continue;
      seen.add(id);
      picked.push(hit);
      if (picked.length >= count) break;
    }

    if (!picked.length) return localRecommendations(unique, count, context);
    return picked;
  } catch {
    return localRecommendations(unique, count, context);
  }
};

// Convenience alias for UI to explicitly request a fresh set of recommendations.
export const refreshRecommendations = aiRecommendations;
