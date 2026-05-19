import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, RefreshCw, X, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiRecommendations, dedupeAnime } from "@/lib/recommendations";
import { jikan, type Anime } from "@/lib/jikan";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// ─── Cache so we don't re-fetch on every open ────────────────────────────────
let poolCache: Anime[] | null = null;
let lastPicksCache: Anime[] = [];
let lastPicksKey = "";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildContextFromSupabase = async (userId: string) => {
  try {
    // Pull watchlist directly from Supabase — persistent, not browser cache
    const { data: watchlist } = await supabase
      .from("watchlist")
      .select("mal_id, title, status, score")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (!watchlist?.length) return {};

    const watchedTitles = watchlist.map((w) => w.title).filter(Boolean);

    // Fetch genres for up to 8 recently watched titles in parallel
    const recentIds = watchlist
      .filter((w) => w.status === "watching" || w.status === "completed")
      .slice(0, 8)
      .map((w) => w.mal_id);

    const genreCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    await Promise.allSettled(
      recentIds.map(async (id) => {
        const anime = await jikan.byId(id);
        for (const g of anime?.genres ?? []) {
          genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
        }
        if (anime?.type) typeCounts[anime.type] = (typeCounts[anime.type] || 0) + 1;
      })
    );

    const watchedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const favoriteTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Exclude already-watched titles from pool later
    const watchedMalIds = new Set(watchlist.map((w) => w.mal_id));

    return { watchedTitles, watchedGenres, favoriteTypes, watchedMalIds };
  } catch {
    return {};
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

export const FloatingAIButton = () => {
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<Anime[]>(lastPicksCache);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const abortRef = useRef<AbortController | null>(null);

  const loadRecommendations = useCallback(async (force = false) => {
    if (loading) return;

    // Use cache unless forced refresh
    const cacheKey = user?.id ?? "guest";
    if (!force && lastPicksCache.length > 0 && lastPicksKey === cacheKey) {
      setPicks(lastPicksCache);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      // Build pool once and cache it
      if (!poolCache) {
        const [top, airing] = await Promise.all([jikan.topAll(), jikan.topAiring()]);
        poolCache = dedupeAnime([...(top ?? []), ...(airing ?? [])]);
      }

      let pool = [...poolCache];
      let context: {
        watchedTitles?: string[];
        watchedGenres?: string[];
        favoriteTypes?: string[];
        watchedMalIds?: Set<number>;
      } = {};

      if (user?.id) {
        context = await buildContextFromSupabase(user.id);

        // Remove already-watched anime from pool so we never suggest them
        if (context.watchedMalIds?.size) {
          pool = pool.filter((a) => !context.watchedMalIds!.has(a.mal_id));
        }

        // Boost pool items that match user's top genres to the front
        if (context.watchedGenres?.length) {
          const favSet = new Set(context.watchedGenres);
          pool = [
            ...pool.filter((a) => (a.genres ?? []).some((g) => favSet.has(g.name))),
            ...pool.filter((a) => !(a.genres ?? []).some((g) => favSet.has(g.name))),
          ];
        }
      }

      const newPicks = await aiRecommendations(pool, 6, context);

      // If AI returns the exact same set, shuffle pool differently and retry once
      const newIds = newPicks.map((p) => p.mal_id).sort().join(",");
      const oldIds = lastPicksCache.map((p) => p.mal_id).sort().join(",");
      if (newIds === oldIds && lastPicksKey === cacheKey) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const fallback = await aiRecommendations(shuffled, 6, context);
        lastPicksCache = fallback;
      } else {
        lastPicksCache = newPicks;
      }

      lastPicksKey = cacheKey;
      setPicks(lastPicksCache);
    } catch {
      // Keep previous picks on error
    } finally {
      setLoading(false);
    }
  }, [user, loading]);

  // Load on open, but only if cache is stale
  useEffect(() => {
    if (open) loadRecommendations(false);
  }, [open]);

  // Reset pool cache when user changes so picks are re-personalized
  useEffect(() => {
    poolCache = null;
    lastPicksCache = [];
    lastPicksKey = "";
  }, [user?.id]);

  return (
    <>
      {/* ── Floating button ── */}
      <div className="fixed right-6 bottom-6 z-50">
        <button
          onClick={() => setOpen((s) => !s)}
          title="AI recommendations"
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            open
              ? "bg-primary text-primary-foreground rotate-12 shadow-glow"
              : "bg-gradient-ember text-primary-foreground hover:scale-110"
          }`}
        >
          <Bot className="w-6 h-6" />
        </button>
      </div>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed right-6 bottom-24 z-50 w-[340px] max-h-[70vh] flex flex-col rounded-2xl bg-background/95 backdrop-blur-xl ring-1 ring-border/60 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
              <div>
                <p className="font-semibold text-sm">AI Picks</p>
                <p className="text-[11px] text-muted-foreground">
                  {user ? "Based on your watchlist" : "Popular picks for you"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => loadRecommendations(true)}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Picks list */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-hide">
              {loading && picks.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Finding picks for you…
                </div>
              )}
              {!loading && picks.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No recommendations yet.
                  <br />
                  <button
                    onClick={() => loadRecommendations(true)}
                    className="mt-2 text-primary text-xs hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}
              {picks.map((a) => (
                <Link
                  key={a.mal_id}
                  to={`/watch/${a.mal_id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary/50 transition-colors group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-secondary/40">
                    <img
                      src={a.images?.jpg?.image_url}
                      alt={a.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-snug">
                      {a.title_english || a.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.score && (
                        <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
                          <Star className="w-2.5 h-2.5 fill-yellow-400" />
                          {a.score.toFixed(1)}
                        </span>
                      )}
                      {a.year && (
                        <span className="text-[10px] text-muted-foreground">{a.year}</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(a.genres ?? []).slice(0, 2).map((g) => (
                        <span
                          key={g.name}
                          className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {!user && (
              <div className="px-4 py-3 border-t border-border/40 shrink-0">
                <p className="text-[11px] text-muted-foreground text-center">
                  <Link to="/auth" className="text-primary hover:underline" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>{" "}
                  for personalized picks based on your watchlist
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingAIButton;
