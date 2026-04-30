import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Anime } from "@/lib/jikan";
import { aiRecommendations } from "@/lib/recommendations";

interface Props {
  seed?: Anime[];
}

const scoreAnime = (a: Anime): number => {
  const score = a.score || 0;
  const episodes = a.episodes || 0;
  const hasEngTitle = a.title_english ? 0.2 : 0;
  const genreBoost = (a.genres?.length || 0) * 0.05;
  return score + Math.min(episodes, 24) * 0.03 + hasEngTitle + genreBoost;
};

export const RecommendationPanel = ({ seed = [] }: Props) => {
  const initial = useMemo(() => {
    return [...seed]
      .filter((a) => !!a?.mal_id)
      .sort((a, b) => scoreAnime(b) - scoreAnime(a))
      .slice(0, 6);
  }, [seed]);

  const [ranked, setRanked] = useState<Anime[]>(initial);
  useEffect(() => setRanked(initial), [initial]);

  const [randomAnime, setRandomAnime] = useState<Anime | null>(initial[0] || null);
  const [loading, setLoading] = useState(false);

  const suggestRandom = () => {
    if (ranked.length === 0) return;
    const pick = ranked[Math.floor(Math.random() * ranked.length)];
    setRandomAnime(pick);
  };

  const refresh = async () => {
    if (!seed || seed.length === 0) return;
    setLoading(true);
    try {
      const picks = await aiRecommendations(seed, 6);
      setRanked(picks.length ? picks : initial);
      setRandomAnime((p) => (p && picks.find((x) => x.mal_id === p.mal_id) ? p : picks[0] || null));
    } catch {
      setRanked(initial);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container py-8">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-5 bg-gradient-to-b from-secondary/35 to-secondary/10 ring-1 ring-border/60">
          <p className="text-xs uppercase tracking-[0.28em] text-primary mb-2">AI-based picks</p>
          <h3 className="text-xl font-semibold mb-4">Curated for you</h3>
          <div className="space-y-2">
            {ranked.map((a) => (
              <Link
                key={a.mal_id}
                to={`/watch/${a.mal_id}`}
                className="flex items-center gap-3 rounded-lg bg-background/60 px-3 py-2 hover:ring-1 hover:ring-primary/50 transition-all"
              >
                <img src={a.images?.jpg?.image_url} alt={a.title || "cover"} className="w-12 h-16 rounded-md object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate mr-2 font-medium">{a.title_english || a.title}</span>
                    <span className="text-xs text-muted-foreground">{(a.score || 0).toFixed(1)}</span>
                  </div>
                  <div className="mt-1 flex gap-2">
                    {(a.genres || []).slice(0, 2).map((g) => (
                      <span key={g.name} className="text-[11px] text-muted-foreground bg-muted/10 px-2 py-0.5 rounded">{g.name}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
            {ranked.length === 0 && <p className="text-sm text-muted-foreground">No recommendation data yet.</p>}
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-b from-secondary/35 to-secondary/10 ring-1 ring-border/60">
          <p className="text-xs uppercase tracking-[0.28em] text-primary mb-2">Discovery</p>
          <h3 className="text-xl font-semibold mb-4">Random anime suggestion</h3>

          {randomAnime ? (
            <div className="rounded-lg bg-background/60 p-4 mb-4">
              <div className="flex items-start gap-3">
                <img src={randomAnime.images?.jpg?.image_url} alt={randomAnime.title || "cover"} className="w-20 h-28 rounded-md object-cover flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium line-clamp-2">{randomAnime.title_english || randomAnime.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">MAL #{randomAnime.mal_id} • {(randomAnime.score || 0).toFixed(1)}</p>
                  <div className="mt-2 flex gap-2">
                    {(randomAnime.genres || []).slice(0, 3).map((g) => (
                      <span key={g.name} className="text-[11px] text-muted-foreground bg-muted/10 px-2 py-0.5 rounded">{g.name}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm" className="bg-gradient-ember text-primary-foreground">
                  <Link to={`/watch/${randomAnime.mal_id}`}>Watch now</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={suggestRandom}>Try another</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No anime available for random suggestion.</p>
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={suggestRandom}>Suggest randomly</Button>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh recommendations"}</Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecommendationPanel;
