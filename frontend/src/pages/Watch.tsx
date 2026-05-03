import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft, Star, Calendar, Tv, AlertTriangle, Ban,
  Languages, RefreshCcw, Server, ExternalLink, SkipForward,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { jikan } from "@/lib/jikan";
import { CommentsRatings } from "@/components/CommentsRatings";
import { AdSlot } from "@/components/AdSlot";
import { api, type StreamOut } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { AnimeEpisode } from "@/lib/jikan";

type Lang = "sub" | "dub";
type Source = "mal" | "anikoto";

const Watch = () => {
  const { id } = useParams();
  const malId = Number(id);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [episode, setEpisode] = useState(() => Number(searchParams.get("ep") || 1));
  const [lang, setLang] = useState<Lang>(() => (searchParams.get("lang") as Lang) || "sub");
  const [source, setSource] = useState<Source>(() => (searchParams.get("source") as Source) || "mal");
  const [anikotoId, setAnikotoId] = useState<number | undefined>(() => {
    const a = searchParams.get("anikoto");
    return a ? Number(a) : undefined;
  });
  const [iframeError, setIframeError] = useState(false);
  const [autoFallbackTried, setAutoFallbackTried] = useState(false);

  // keep URL in sync (so ep/lang are shareable)
  useEffect(() => {
    const q = new URLSearchParams();
    q.set("ep", String(episode));
    q.set("lang", lang);
    if (source !== "mal") q.set("source", source);
    if (anikotoId) q.set("anikoto", String(anikotoId));
    setSearchParams(q, { replace: true });
  }, [episode, lang, source, anikotoId, setSearchParams]);

  const anime = useQuery({ queryKey: ["anime", id], queryFn: () => jikan.byId(id!), enabled: !!id });
  const eps = useQuery({ queryKey: ["eps", id], queryFn: () => jikan.episodes(id!), enabled: !!id });
  const blocked = useQuery({
    queryKey: ["blocked", id],
    queryFn: () => api.isAnimeBlocked(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (anime.data) {
      document.title = `${anime.data.title_english || anime.data.title} — Hey Anime`;
    }
  }, [anime.data]);

  useEffect(() => { setIframeError(false); }, [episode, id, lang, source]);

  const episodeList = (() => {
    const hasApiEps = Array.isArray(eps.data) && eps.data.length > 0;
    const status = (anime.data?.status || "").toString();
    const isUpcoming = /not yet aired|upcoming/i.test(status);

    if (hasApiEps) {
      return (eps.data as AnimeEpisode[]).filter((ep) => {
        if (!ep || !ep.aired) return true;
        const d = new Date(ep.aired);
        return isNaN(d.getTime()) ? true : d.getTime() <= Date.now();
      });
    }

    // Don't synthesize placeholder episodes for titles that haven't aired yet
    if (!isUpcoming && typeof anime.data?.episodes === "number" && anime.data.episodes > 0) {
      return Array.from({ length: anime.data.episodes }, (_, i) => ({
        mal_id: i + 1,
        title: `Episode ${i + 1}`,
        episodeNumber: i + 1,
      }));
    }

    return [] as AnimeEpisode[];
  })();

  const stream = useQuery({
    queryKey: ["stream", id, episode, lang, source, anikotoId],
    queryFn: () => api.getStream(malId, episode, lang, source, anikotoId),
    enabled: !!id && !blocked.data?.blocked && episodeList.length > 0 && (source !== "anikoto" || !!anikotoId),
    retry: 0,
  });

  const nextAiringEpisode = useMemo(() => {
    const allEpisodes = Array.isArray(eps.data) ? (eps.data as AnimeEpisode[]) : [];
    return allEpisodes.find((ep) => ep.aired && !Number.isNaN(new Date(ep.aired).getTime()) && new Date(ep.aired).getTime() > Date.now()) || null;
  }, [eps.data]);

  const nextAiringLabel = useMemo(() => {
    if (!nextAiringEpisode?.aired) return null;
    try {
      return new Date(nextAiringEpisode.aired).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return nextAiringEpisode.aired;
    }
  }, [nextAiringEpisode]);

  const totalEpisodes = episodeList.length;
  const currentEpisodeIndex = useMemo(
    () => episodeList.findIndex((ep) => ep.episodeNumber === episode),
    [episodeList, episode],
  );
  const nextEpisodeNumber = currentEpisodeIndex >= 0 && currentEpisodeIndex < episodeList.length - 1
    ? episodeList[currentEpisodeIndex + 1].episodeNumber
    : null;

  useEffect(() => {
    if (!Number.isFinite(episode) || episode < 1) {
      setEpisode(episodeList[0]?.episodeNumber || 1);
      return;
    }
    if (episodeList.length > 0 && currentEpisodeIndex === -1) {
      setEpisode(episodeList[0].episodeNumber);
    }
  }, [episode, currentEpisodeIndex, episodeList]);

  useEffect(() => {
    if (!stream.error) return;
    if (source === "anikoto") {
      toast.warning("Episode unavailable on Server 2. Switched to Server 1.");
      setSource("mal");
      return;
    }
    if (source === "mal" && !autoFallbackTried) {
      setAutoFallbackTried(true);
      (async () => {
        try {
          const resolved = await api.anikotoResolve(malId);
          if (resolved.anikoto_id) {
            setAnikotoId(resolved.anikoto_id);
            setSource("anikoto");
            toast.warning("Server 1 lookup failed. Trying Server 2 instead.");
          }
        } catch {
          // keep the existing fallback UI
        }
      })();
    }
  }, [stream.error, source, autoFallbackTried, malId]);

  const handleReportStream = async () => {
      if (!user) {
        toast('Sign in to report broken streams');
        return;
      }
      try {
        toast.loading('Reporting stream…', { id: 'report-stream' });
        await api.reportStream({
          mal_id: malId,
          episode,
          lang,
          source,
          anikoto_id: anikotoId,
          reported_url: stream.data?.embed_url,
          notes: '',
        });
        toast.success('Thanks — report submitted', { id: 'report-stream' });
      } catch (e) {
        toast.error('Failed to submit report', { id: 'report-stream' });
      }
    };

  // Player postMessage events: progress + auto-next + error fallback
  const lastSavedAt = useRef<number>(0);
  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      let data: unknown = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (!data || typeof data !== "object") return;
      const d = data as Record<string, unknown>;

      // error → try to switch source automatically
      if (d.event === "error") {
        setIframeError(true);
        return;
      }

      // progress (megaplay sends both `event:"time"` and `type:"watching-log"`)
      const isTime = d.event === "time" || d.type === "watching-log";
      if (isTime && user) {
        const current = Number(d.currentTime ?? d.time ?? 0);
        const duration = Number(d.duration ?? 0);
        const percent = duration > 0
          ? Math.max(0, Math.min(100, (current / duration) * 100))
          : Number(d.percent ?? 0);
        const now = Date.now();
        if (now - lastSavedAt.current > 8000) { // throttle to every 8s
          lastSavedAt.current = now;
          api.saveProgress({
            mal_id: malId,
            episode,
            current_time: current,
            duration,
            percent,
            completed: false,
            title: anime.data?.title_english || anime.data?.title,
            image_url: anime.data?.images?.jpg?.large_image_url,
          }).catch(() => {});
        }
      }

      // complete → autoplay next
      if (d.event === "complete") {
        if (user) {
          api.saveProgress({
            mal_id: malId, episode,
            current_time: 0, duration: 0, percent: 100, completed: true,
            title: anime.data?.title_english || anime.data?.title,
            image_url: anime.data?.images?.jpg?.large_image_url,
          }).catch(() => {});
        }
        if (nextEpisodeNumber) {
          toast.success(`Up next: episode ${nextEpisodeNumber}`);
          setEpisode(nextEpisodeNumber);
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [user, malId, episode, nextEpisodeNumber, anime.data]);

  const playerSrc = stream.data?.embed_url;
  const streamErrored = !!stream.error;

  const showFallback = !blocked.data?.blocked && (iframeError || streamErrored);

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

            {/* Player toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <SegmentedToggle
                label={<><Languages className="w-3.5 h-3.5" /> Lang</>}
                value={lang}
                onChange={(v) => setLang(v as Lang)}
                options={[{ value: "sub", label: "SUB" }, { value: "dub", label: "DUB" }]}
              />
              <SegmentedToggle
                label={<><Server className="w-3.5 h-3.5" /> Source</>}
                value={source}
                onChange={async (v) => {
                  if (v === "anikoto") {
                    if (!anikotoId) {
                      toast.loading("Finding on Server 2…", { id: "anikoto-resolve" });
                      try {
                        const res = await api.anikotoResolve(malId);
                        if (res.anikoto_id) {
                          setAnikotoId(res.anikoto_id);
                          setSource("anikoto");
                          toast.success(
                            `Server 2: matched "${res.matched_title}" (${Math.round(res.score * 100)}%)`,
                            { id: "anikoto-resolve" }
                          );
                        } else {
                          toast.error(
                            res.reason || "Couldn't find a match on Server 2 for this title.",
                            { id: "anikoto-resolve" }
                          );
                        }
                      } catch (e) {
                        toast.error("Server 2 lookup failed. Try again.", { id: "anikoto-resolve" });
                      }
                      return;
                    }
                    setSource("anikoto");
                  } else {
                    setSource("mal");
                  }
                }}
                options={[
                  { value: "mal", label: "Server 1 (MAL)" },
                  { value: "anikoto", label: anikotoId ? `Server 2 (#${anikotoId})` : "Server 2 (Anikoto)" },
                ]}
              />
              <Button
                size="sm" variant="ghost"
                onClick={() => { setIframeError(false); stream.refetch(); }}
                className="h-8 px-2"
                title="Reload player"
              >
                <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Reload
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReportStream} className="h-8 px-2" title="Report broken stream">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Report
              </Button>
              {nextEpisodeNumber && (
                <Button
                  size="sm" variant="ghost" onClick={() => setEpisode(nextEpisodeNumber)}
                  className="h-8 px-2 text-primary hover:text-primary"
                >
                  <SkipForward className="w-3.5 h-3.5 mr-1" /> Next ep
                </Button>
              )}
              {stream.data && (
                <span className="ml-auto text-muted-foreground/70 truncate max-w-[300px] flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  via {stream.data.source}
                </span>
              )}
            </div>

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
              ) : showFallback ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-3">
                  <AlertTriangle className="w-10 h-10 text-primary" />
                  <p className="font-display text-2xl">Stream unavailable</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    The provider couldn't load this episode. Try toggling SUB ↔ DUB, switching server, or another episode.
                  </p>
                  <a
                    href="https://megaplay.buzz/api#mal-anilist-coverage"
                    target="_blank" rel="noreferrer"
                    className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    Report missing title <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : episodeList.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-3 bg-gradient-to-b from-background/20 to-background/80">
                  <AlertTriangle className="w-10 h-10 text-primary" />
                  <p className="font-display text-2xl">Coming soon</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    This title has no released episodes yet. We'll show the player when it starts airing.
                  </p>
                </div>
              ) : !playerSrc ? (
                <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                  Loading player…
                </div>
              ) : (
                <iframe
                  key={playerSrc}
                  src={playerSrc}
                  title="Player"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                  referrerPolicy="origin"
                  className="absolute inset-0 w-full h-full"
                  onError={() => setIframeError(true)}
                />
              )}
            </div>

            {nextAiringEpisode && nextAiringLabel && (
              <div className="mt-3 rounded-lg bg-secondary/40 ring-1 ring-border/50 px-4 py-2 text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">Next episode:</span>
                <span>Episode {nextAiringEpisode.episodeNumber}</span>
                <span>•</span>
                <span>{nextAiringLabel} (it's coming)</span>
              </div>
            )}

            {/* Title block */}
            {anime.data && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">
                  Episode {episode}{totalEpisodes ? ` / ${totalEpisodes}` : ""}
                </p>
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
                  const num = ep.episodeNumber || i + 1;
                  const active = num === episode;
                  return (
                    <button
                      key={`${ep.mal_id}-${num}`}
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

interface SegOpt { value: string; label: string; disabled?: boolean; title?: string }
const SegmentedToggle = ({
  label, value, onChange, options,
}: { label: React.ReactNode; value: string; onChange: (v: string) => void; options: SegOpt[] }) => (
  <div className="inline-flex items-center gap-2 rounded-md bg-secondary/40 ring-1 ring-border/50 px-2 py-1">
    <span className="text-muted-foreground flex items-center gap-1">{label}</span>
    <div className="flex">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            disabled={o.disabled}
            title={o.title}
            onClick={() => !o.disabled && onChange(o.value)}
            className={`px-2.5 py-0.5 rounded transition-colors ${
              active
                ? "bg-gradient-ember text-primary-foreground"
                : "text-foreground/70 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default Watch;
