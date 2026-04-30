import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, Star, Calendar, Tv, AlertTriangle, Ban } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { jikan } from "@/lib/jikan";
import { CommentsRatings } from "@/components/CommentsRatings";
import { AdSlot } from "@/components/AdSlot";
import { api } from "@/lib/api";

const Watch = () => {
  const { id } = useParams();
  const [episode, setEpisode] = useState(1);
  const [iframeError, setIframeError] = useState(false);

  const anime = useQuery({ queryKey: ["anime", id], queryFn: () => jikan.byId(id!), enabled: !!id });
  const eps = useQuery({ queryKey: ["eps", id], queryFn: () => jikan.episodes(id!), enabled: !!id });
  const blocked = useQuery({
    queryKey: ["blocked", id],
    queryFn: () => api.isAnimeBlocked(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (anime.data) {
      document.title = `${anime.data.title_english || anime.data.title} — Lumen`;
    }
  }, [anime.data]);

  useEffect(() => { setIframeError(false); }, [episode, id]);

  // megaplay.buzz embed pattern: https://megaplay.buzz/stream/s-2/{malId}/sub
  // We provide episode via query; if their player ignores it, user can click episode list.
  const streamUrl = useMemo(() => {
    if (!id) return "";
    return `https://megaplay.buzz/stream/s-2/${id}/sub?ep=${episode}`;
  }, [id, episode]);

  const episodeList = eps.data && eps.data.length > 0
    ? eps.data
    : Array.from({ length: anime.data?.episodes || 12 }, (_, i) => ({ mal_id: i + 1, title: `Episode ${i + 1}` }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Backdrop */}
      <div className="relative h-[55vh] min-h-[420px] w-full overflow-hidden">
        {anime.data && (
          <img
            src={anime.data.images.jpg.large_image_url}
            alt={anime.data.title}
            className="w-full h-full object-cover blur-2xl scale-110 opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      <main className="container -mt-[45vh] relative z-10 pb-24">
        <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground">
          <Link to="/"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Link>
        </Button>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Player */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-cinematic ring-1 ring-border/60">
              {blocked.data?.blocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-3">
                  <Ban className="w-10 h-10 text-destructive" />
                  <p className="font-display text-2xl">This title is unavailable</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {blocked.data.reason || "Removed by the moderation team."}
                  </p>
                </div>
              ) : iframeError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-3">
                  <AlertTriangle className="w-10 h-10 text-primary" />
                  <p className="font-display text-2xl">Stream unavailable</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    The provider couldn't load this episode. Try another episode or come back later.
                  </p>
                </div>
              ) : (
                <iframe
                  key={streamUrl}
                  src={streamUrl}
                  title="Player"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full"
                  onError={() => setIframeError(true)}
                />
              )}
            </div>

            {/* Title block */}
            {anime.data && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Episode {episode}</p>
                <h1 className="font-display text-3xl md:text-5xl font-semibold text-balance">
                  {anime.data.title_english || anime.data.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {anime.data.score && (
                    <span className="flex items-center gap-1.5"><Star className="w-4 h-4 fill-primary text-primary" /> {anime.data.score.toFixed(2)}</span>
                  )}
                  {anime.data.year && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {anime.data.year}</span>}
                  {anime.data.episodes && <span className="flex items-center gap-1.5"><Tv className="w-4 h-4" /> {anime.data.episodes} episodes</span>}
                  {anime.data.status && <span>• {anime.data.status}</span>}
                </div>
                {anime.data.genres && anime.data.genres.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {anime.data.genres.map((g) => (
                      <Badge key={g.name} variant="secondary" className="bg-secondary/80">{g.name}</Badge>
                    ))}
                  </div>
                )}
                {anime.data.synopsis && (
                  <p className="mt-6 text-foreground/85 leading-relaxed max-w-3xl">{anime.data.synopsis}</p>
                )}
              </div>
            )}
          </motion.div>

          {/* Episodes sidebar */}
          <aside className="lg:sticky lg:top-24 self-start space-y-4">
            <div className="rounded-xl bg-card/60 ring-1 ring-border/60 p-4 backdrop-blur">
              <h2 className="font-display text-lg font-semibold mb-3">Episodes</h2>
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-1 scrollbar-hide">
                {episodeList.map((ep, i) => {
                  const num = i + 1;
                  const active = num === episode;
                  return (
                    <button
                      key={ep.mal_id}
                      onClick={() => setEpisode(num)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                        active
                          ? "bg-gradient-ember text-primary-foreground shadow-glow"
                          : "hover:bg-secondary/70 text-foreground/85"
                      }`}
                    >
                      <span className="font-mono text-xs opacity-70 mr-2">{String(num).padStart(2, "0")}</span>
                      <span className="line-clamp-1">{ep.title || `Episode ${num}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <AdSlot slot="watch-side" className="rounded-lg" />
          </aside>
        </div>

        {/* Comments & ratings */}
        {id && <CommentsRatings malId={id} />}
      </main>
    </div>
  );
};

export default Watch;
