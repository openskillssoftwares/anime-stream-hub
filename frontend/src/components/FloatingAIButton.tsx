import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiRecommendations, dedupeAnime } from "@/lib/recommendations";
import { jikan, type Anime } from "@/lib/jikan";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export const FloatingAIButton = () => {
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const loadPersonalized = async () => {
    setLoading(true);
    try {
      const [top, airing] = await Promise.all([jikan.topAll(), jikan.topAiring()]);
      let pool = dedupeAnime([...(top || []), ...(airing || [])]);
      const context: { watchedGenres?: string[]; watchedTitles?: string[]; favoriteTypes?: string[] } = {};

      // personalize using user's recent progress genres when available
      if (user) {
        try {
          const progress = await api.myProgress(12);
          const ids = Array.from(new Set(progress.map((p) => p.mal_id))).slice(0, 6);
          context.watchedTitles = progress.map((p) => p.title).filter(Boolean) as string[];
          const genreSets: string[] = [];
          const typeSets: string[] = [];
          for (const id of ids) {
            const a = await jikan.byId(id);
            if (a?.genres) genreSets.push(...a.genres.map((g) => g.name));
            if (a?.type) typeSets.push(a.type);
          }
          const topGenres = genreSets.reduce<Record<string, number>>((acc, g) => { acc[g] = (acc[g] || 0) + 1; return acc; }, {});
          const fav = new Set(Object.keys(topGenres).sort((a, b) => topGenres[b] - topGenres[a]).slice(0, 3));
          context.watchedGenres = Array.from(fav);
          context.favoriteTypes = Array.from(new Set(typeSets)).slice(0, 3);
          // move favored genre items to the front of pool
          pool = [...pool.filter((p) => (p.genres || []).some((g) => fav.has(g.name))), ...pool.filter((p) => !(p.genres || []).some((g) => fav.has(g.name)))];
        } catch {
          // ignore personalization failures
        }
      }

      const picks = await aiRecommendations(pool, 6, context);
      setPicks(picks);
    } catch {
      setPicks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadPersonalized();
  }, [open]);

  return (
    <div>
      <div className="fixed right-6 bottom-6 z-50">
        <Button className="rounded-full w-14 h-14 shadow-xl flex items-center justify-center" onClick={() => setOpen((s) => !s)} title="AI picks">
          <Bot className="w-6 h-6" />
        </Button>
      </div>

      {open && (
        <div className="fixed right-6 bottom-24 z-50 w-80">
          <div className="rounded-xl bg-background ring-1 ring-border/60 p-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">AI Picks for you</div>
              <Button size="sm" variant="ghost" onClick={loadPersonalized} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-auto">
              {picks.length === 0 && <div className="text-sm text-muted-foreground">No picks yet.</div>}
              {picks.map((a) => (
                <div key={a.mal_id} className="flex items-center gap-3">
                  <img src={a.images?.jpg?.image_url} alt={a.title} className="w-12 h-16 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="truncate font-medium">{a.title_english || a.title}</div>
                      <div className="text-xs text-muted-foreground">{(a.score || 0).toFixed(1)}</div>
                    </div>
                    <div className="mt-1 flex gap-1">
                      {(a.genres || []).slice(0, 2).map((g) => (
                        <span key={g.name} className="text-[11px] text-muted-foreground bg-muted/10 px-2 py-0.5 rounded">{g.name}</span>
                      ))}
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-gradient-ember text-primary-foreground">
                    <Link to={`/watch/${a.mal_id}`}>Open</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingAIButton;
