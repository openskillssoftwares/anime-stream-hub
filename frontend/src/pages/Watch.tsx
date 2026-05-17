import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft, Star, Calendar, Tv, AlertTriangle, Ban,
  Languages, RefreshCcw, Server, ExternalLink, SkipForward, MessageSquare, Share2,
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

type Lang = "sub" | "dub" | "hin";
type Source = "mal" | "anikoto" | "consumet";
type Version = "default" | "uncensored";

interface PlayerEvent {
  type: "play" | "pause" | "seek" | "change_episode";
  currentTime?: number;
  episode?: number;
}

const Watch = () => {
  const { id } = useParams();
  const malId = Number(id);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomCode = (searchParams.get("room") || "").toUpperCase();

  const [episode, setEpisode] = useState(() => Number(searchParams.get("ep") || 1));
  const [lang, setLang] = useState<Lang>(() => (searchParams.get("lang") as Lang) || "sub");
  const [source, setSource] = useState<Source>(() => (searchParams.get("source") as Source) || "mal");
  const [version, setVersion] = useState<Version>(() => (searchParams.get("v") as Version) || "default");
  const [anikotoId, setAnikotoId] = useState<number | undefined>(() => {
    const a = searchParams.get("anikoto");
    return a ? Number(a) : undefined;
  });
  const [iframeError, setIframeError] = useState(false);
  const [autoFallbackTried, setAutoFallbackTried] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [fallbackNoticeShown, setFallbackNoticeShown] = useState(false);
  const [hindiEmbedUrl, setHindiEmbedUrl] = useState<string | null>(null);
  const [hindiLoading, setHindiLoading] = useState(false);
  const [hindiAvailable, setHindiAvailable] = useState<boolean | null>(null); // null = not checked yet
  const ws = useRef<WebSocket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const suppressOutgoingUntil = useRef<number>(0);

  // WebSocket connection for rooms
  useEffect(() => {
    if (!roomCode) return;

    const wsUrl = ((import.meta.env.VITE_BACKEND_URL as string) || window.location.origin)
      .replace("http", "ws") + `/ws/rooms/${roomCode}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.current.onmessage = (event) => {
      const message: PlayerEvent = JSON.parse(event.data);
      const player = iframeRef.current;
      if (!player) return;

      suppressOutgoingUntil.current = Date.now() + 800;

      switch (message.type) {
        case "play":
          player.contentWindow?.postMessage({ event: "play" }, "*");
          break;
        case "pause":
          player.contentWindow?.postMessage({ event: "pause" }, "*");
          break;
        case "seek":
          if (message.currentTime) {
            player.contentWindow?.postMessage({ event: "seek", time: message.currentTime }, "*");
          }
          break;
        case "change_episode":
          if (message.episode) {
            setEpisode(message.episode);
          }
          break;
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.current?.close();
    };
  }, [roomCode]);

  const sendPlayerEvent = (event: PlayerEvent) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(event));
    }
  };

  // keep URL in sync (so ep/lang are shareable)
  useEffect(() => {
    const q = new URLSearchParams();
    q.set("ep", String(episode));
    q.set("lang", lang);
    if (roomCode) q.set("room", roomCode);
    if (source !== "mal") q.set("source", source);
    if (version !== "default") q.set("v", version);
    if (anikotoId) q.set("anikoto", String(anikotoId));
    setSearchParams(q, { replace: true });
  }, [episode, lang, source, version, anikotoId, roomCode, setSearchParams]);

  const anime = useQuery({ queryKey: ["anime", id], queryFn: () => jikan.byId(id!), enabled: !!id });
  const eps = useQuery({ queryKey: ["eps", id], queryFn: () => jikan.episodes(id!), enabled: !!id });
  const blocked = useQuery({
    queryKey: ["blocked", id],
    queryFn: () => api.isAnimeBlocked(id!),
    enabled: !!id,
  });
  const streamOptions = useQuery({
    queryKey: ["stream-options", id],
    queryFn: () => api.streamOptions(id!, anime.data?.title_english || anime.data?.title || undefined),
    enabled: !!id && !!anime.data,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (anime.data) {
      document.title = `${anime.data.title_english || anime.data.title} — Hey Anime`;
    }
  }, [anime.data]);

  // Restore user's saved progress for this anime (only if episode not explicitly set via URL)
  useEffect(() => {
    if (!user || !malId || searchParams.get("ep") !== null || !eps.data || eps.data.length === 0) {
      return; // Episode was explicitly set in URL, or user/anime not ready
    }

    api.myProgress(100)
      .then((progress) => {
        const savedProgress = progress.find((p) => p.mal_id === malId);
        if (savedProgress && savedProgress.episode > 0) {
          const episodeNumbers = (eps.data as AnimeEpisode[]).map((e) => e.episodeNumber).filter(Boolean);
          if (episodeNumbers.includes(savedProgress.episode) || savedProgress.episode <= (anime.data?.episodes || 999)) {
            setEpisode(savedProgress.episode);
          }
        }
      })
      .catch(() => {
        // Silent fail — use default episode 1
      });
  }, [user, malId, searchParams, eps.data, anime.data?.episodes]);

  useEffect(() => {
    setIframeError(false);
    // Only reset iframe loading for sub/dub — Hindi uses its own <video> element
    if (lang !== "hin") setIframeLoading(true);
  }, [episode, id, lang, source, version]);

  // ── Hindi dub: search Tatakai API then resolve episode embed ──────────────
  const TATAKAI_BASE = "https://api.tatakai.me";

  useEffect(() => {
    if (!anime.data) return;
    // Only check availability once per anime load
    if (hindiAvailable !== null) return;

    const title = anime.data.title_english || anime.data.title;
    if (!title) return;

    setHindiLoading(true);
    fetch(`${TATAKAI_BASE}/api/v1/hindidubbed/search?q=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then((data) => {
        const results = data?.results ?? data?.data ?? [];
        if (Array.isArray(results) && results.length > 0) {
          setHindiAvailable(true);
        } else {
          setHindiAvailable(false);
        }
      })
      .catch(() => setHindiAvailable(false))
      .finally(() => setHindiLoading(false));
  }, [anime.data, hindiAvailable]);

  // ── Resolve Hindi embed URL when lang === "hin" ───────────────────────────
  useEffect(() => {
    if (lang !== "hin" || !anime.data) return;
    if (hindiEmbedUrl) return; // already resolved

    const title = anime.data.title_english || anime.data.title;
    if (!title) return;

    setHindiLoading(true);
    setIframeLoading(true);

    fetch(`${TATAKAI_BASE}/api/v1/hindidubbed/search?q=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then(async (data) => {
        const results = data?.results ?? data?.data ?? [];
        if (!Array.isArray(results) || results.length === 0) {
          throw new Error("No Hindi dub found");
        }

        // Pick best match by title similarity
        const animeTitle = title.toLowerCase();
        const best = results.reduce((prev: any, curr: any) => {
          const prevTitle = (curr.title || curr.name || "").toLowerCase();
          const currTitle = (curr.title || curr.name || "").toLowerCase();
          return currTitle.includes(animeTitle) || animeTitle.includes(currTitle) ? curr : prev;
        }, results[0]);

        const seriesId = best?.id || best?.animeId;
        if (!seriesId) throw new Error("No series ID");

        // Get episodes from the series
        const seriesRes = await fetch(`${TATAKAI_BASE}/api/v1/hindidubbed/episodes/${seriesId}`);
        const seriesData = await seriesRes.json();
        const episodes = seriesData?.episodes ?? seriesData?.data ?? [];

        if (!Array.isArray(episodes) || episodes.length === 0) {
          throw new Error("No episodes found");
        }

        // Find matching episode
        const epData = episodes.find((e: any) =>
          Number(e.number ?? e.episode ?? e.episodeNumber) === episode
        ) ?? episodes[Math.min(episode - 1, episodes.length - 1)];

        const embedId = epData?.id ?? epData?.episodeId ?? epData?.embed_id;
        if (!embedId) throw new Error("No embed ID");

        // Get stream sources from Tatakai consumet proxy
        const streamRes = await fetch(`${TATAKAI_BASE}/api/v1/consumet/anime/gogoanime/watch/${encodeURIComponent(embedId)}`);
        const streamData = await streamRes.json();

        // Consumet returns { sources: [{url, quality}], headers: {...} }
        const sources: { url: string; quality?: string; isM3U8?: boolean }[] =
          streamData?.sources ?? streamData?.data?.sources ?? [];

        if (!sources.length) throw new Error("No stream sources");

        // Prefer 1080p → 720p → default → first available
        const preferred = sources.find((s) => s.quality === "1080p")
          ?? sources.find((s) => s.quality === "720p")
          ?? sources.find((s) => s.quality === "default")
          ?? sources[0];

        setHindiEmbedUrl(preferred.url);
        setHindiAvailable(true);
      })
      .catch((err) => {
        console.warn("Hindi dub resolve failed:", err);
        toast.error("Hindi dub not available for this episode. Switching to SUB.");
        setLang("sub");
        setHindiAvailable(false);
      })
      .finally(() => setHindiLoading(false));
  }, [lang, episode, anime.data, hindiEmbedUrl]);

  // Reset hindi embed when episode changes
  useEffect(() => {
    setHindiEmbedUrl(null);
  }, [episode, id]);

  const isUpcoming = useMemo(() => {
    const status = (anime.data?.status || "").toString().toLowerCase();
    const statusSaysUpcoming = /not yet aired|upcoming|not yet released/.test(status);
    const hasReleasedEpisode = Array.isArray(eps.data)
      && (eps.data as AnimeEpisode[]).some((ep) => {
        if (!ep?.aired) return false;
        const t = new Date(ep.aired).getTime();
        return Number.isFinite(t) && t <= Date.now();
      });
    return statusSaysUpcoming && !hasReleasedEpisode;
  }, [anime.data?.status, eps.data]);

  const isAiring = useMemo(() => {
    const status = (anime.data?.status || "").toString().toLowerCase();
    if (/finished airing|completed|ended/.test(status)) return false;
    return /currently airing|airing|ongoing|releasing/.test(status);
  }, [anime.data?.status]);

  const episodeList = (() => {
    const hasApiEps = Array.isArray(eps.data) && eps.data.length > 0;

    if (isUpcoming) {
      return [] as AnimeEpisode[];
    }

    if (hasApiEps) {
      const filtered = (eps.data as AnimeEpisode[]).filter((ep) => {
        if (!ep || !ep.aired) return true;
        const d = new Date(ep.aired);
        return isNaN(d.getTime()) ? true : d.getTime() <= Date.now();
      });
      if (filtered.length > 0) return filtered;
    }

    // Synthesize placeholder episodes for titles that have aired or are airing
    if (!isUpcoming && typeof anime.data?.episodes === "number" && anime.data.episodes > 0) {
      return Array.from({ length: anime.data.episodes }, (_, i) => ({
        mal_id: i + 1,
        title: `Episode ${i + 1}`,
        episodeNumber: i + 1,
      }));
    }

    // Last resort: if not upcoming, include at least episode 1
    if (!isUpcoming) {
      return [{
        mal_id: 1,
        title: "Episode 1",
        episodeNumber: 1,
      }];
    }

    return [] as AnimeEpisode[];
  })();

  const stream = useQuery<StreamOut>({
    queryKey: ["stream", id, episode, lang, source, version, anikotoId],
    queryFn: async (): Promise<StreamOut> => {
      const title = anime.data?.title_english || anime.data?.title || undefined;
      // MegaPlay only understands "sub" | "dub" — Hindi is handled separately via Tatakai
      const megaplayLang: "sub" | "dub" = lang === "dub" ? "dub" : "sub";
      const result = await api.getStream(malId, episode, megaplayLang, source, anikotoId, title, version);
      if (!result.embed_url) {
        throw new Error("Stream URL not found in response");
      }
      return result;
    },
    // Disable entirely when Hindi is selected — Tatakai handles it independently
    enabled: !!anime.data && episode > 0 && lang !== "hin",
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // When user explicitly changes source, reset the auto-fallback flag
  useEffect(() => {
    setAutoFallbackTried(false);
  }, [source]);

  useEffect(() => {
    if (stream.error) {
      setIframeError(true);
    }
  }, [stream.error]);

  useEffect(() => {
    if (!stream.data || fallbackNoticeShown) return;
    if (stream.data.mal_id !== malId) {
      setFallbackNoticeShown(true);
      toast.info("Switched to a compatible stream match for this title.");
    }
  }, [stream.data, malId, fallbackNoticeShown]);

  useEffect(() => {
    if (lang === "dub" && streamOptions.data && !streamOptions.data.has_dub) {
      setLang("sub");
      toast.info("Dub is not available for this title. Switched to sub.");
    }
  }, [lang, streamOptions.data]);

  useEffect(() => {
    if (version === "uncensored" && streamOptions.data && !streamOptions.data.has_uncensored) {
      setVersion("default");
      toast.info("Uncensored version is not available for this title.");
    }
  }, [version, streamOptions.data]);

  const nextAiringEpisode = useMemo(() => {
    const allEpisodes = Array.isArray(eps.data) ? (eps.data as AnimeEpisode[]) : [];
    return allEpisodes.find((ep) => ep.aired && !Number.isNaN(new Date(ep.aired).getTime()) && new Date(ep.aired).getTime() > Date.now()) || null;
  }, [eps.data]);

  const nextAiringLabel = useMemo(() => {
    if (!nextAiringEpisode?.aired) return null;
    try {
      return new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "GMT",
        timeZoneName: "short",
      }).format(new Date(nextAiringEpisode.aired));
    } catch {
      return nextAiringEpisode.aired;
    }
  }, [nextAiringEpisode]);

  const nextBroadcastGmtLabel = useMemo(() => {
    if (!isAiring || nextAiringLabel) return null;
    const broadcast = anime.data?.broadcast;
    if (!broadcast) return null;

    const dayRaw = (broadcast.day || broadcast.string || "").toLowerCase();
    const timeRaw = (broadcast.time || broadcast.string || "").toLowerCase();
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDayEntry = Object.entries(dayMap).find(([name]) => dayRaw.includes(name));
    const targetDow = targetDayEntry?.[1];
    const timeMatch = timeRaw.match(/(\d{1,2}):(\d{2})/);
    if (targetDow === undefined || !timeMatch) return null;

    const hh = Number(timeMatch[1]);
    const mm = Number(timeMatch[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

    const sourceOffsetMinutes = /jst/.test(broadcast.string || "") ? 9 * 60 : 0;
    const now = new Date();
    const nowSource = new Date(now.getTime() + sourceOffsetMinutes * 60_000);
    const nowSourceDow = nowSource.getUTCDay();
    let daysAhead = (targetDow - nowSourceDow + 7) % 7;

    const passedToday =
      daysAhead === 0 &&
      (hh < nowSource.getUTCHours() || (hh === nowSource.getUTCHours() && mm <= nowSource.getUTCMinutes()));
    if (passedToday) daysAhead = 7;

    const targetSourcePseudoUtc = Date.UTC(
      nowSource.getUTCFullYear(), nowSource.getUTCMonth(),
      nowSource.getUTCDate() + daysAhead, hh, mm, 0, 0,
    );
    const targetUtc = new Date(targetSourcePseudoUtc - sourceOffsetMinutes * 60_000);

    try {
      return new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "GMT",
        timeZoneName: "short",
      }).format(targetUtc);
    } catch {
      return null;
    }
  }, [anime.data?.broadcast, isAiring, nextAiringLabel]);

  const totalEpisodes = episodeList.length;
  const currentEpisodeIndex = useMemo(
    () => episodeList.findIndex((ep) => ep.episodeNumber === episode),
    [episodeList, episode],
  );
  const nextEpisodeNumber = currentEpisodeIndex >= 0 && currentEpisodeIndex < episodeList.length - 1
    ? episodeList[currentEpisodeIndex + 1].episodeNumber
    : isAiring && typeof anime.data?.episodes === "number" && anime.data.episodes > episodeList.length
      ? episodeList.length + 1
    : null;

  const scheduleBanner = useMemo(() => {
    // Show schedule only for actively airing shows.
    if (isAiring) {
      if (nextAiringEpisode?.aired && nextAiringLabel) {
        return {
          episode: nextAiringEpisode.episodeNumber,
          label: nextAiringLabel,
          subtitle: "Next episode is scheduled",
        };
      }
      // Fallback to broadcast schedule for airing shows without next episode data
      if (nextBroadcastGmtLabel) {
        return {
          episode: (episodeList.length || 0) + 1,
          label: nextBroadcastGmtLabel,
          subtitle: "Weekly broadcast schedule (GMT)",
        };
      }
    }
    return null;
  }, [isAiring, nextAiringEpisode, nextAiringLabel, nextBroadcastGmtLabel, episodeList.length]);

  useEffect(() => {
    if (!Number.isFinite(episode) || episode < 1) {
      setEpisode(episodeList[0]?.episodeNumber || 1);
      return;
    }
    if (episodeList.length > 0 && currentEpisodeIndex === -1) {
      setEpisode(episodeList[0].episodeNumber);
    }
  }, [episode, currentEpisodeIndex, episodeList]);

  // Auto-resolve Anikoto ID proactively as soon as anime data loads,
  // so the fallback is instant if MAL stream fails or shows a 404 page.
  useEffect(() => {
    if (!anime.data || anikotoId) return;
    api.anikotoResolve(malId)
      .then((res) => { if (res.anikoto_id) setAnikotoId(res.anikoto_id); })
      .catch(() => {}); // silent — just a pre-fetch
  }, [anime.data, malId]);

  const tryAnikotoFallback = useCallback(async () => {
    if (autoFallbackTried) return;
    setAutoFallbackTried(true);
    try {
      // Use already-resolved anikotoId if we have it
      if (anikotoId) {
        setSource("anikoto");
        toast.info("Switching to Server 2…");
        return;
      }
      const resolved = await api.anikotoResolve(malId);
      if (resolved.anikoto_id) {
        setAnikotoId(resolved.anikoto_id);
        setSource("anikoto");
        toast.info("Switching to Server 2…");
      } else {
        toast.error("Stream unavailable on both servers. Try another episode.");
      }
    } catch {
      toast.error("Stream unavailable. Try another episode or server.");
    }
  }, [autoFallbackTried, anikotoId, malId]);

  useEffect(() => {
    if (!stream.error) return;
    if (source === "anikoto") {
      toast.warning("Episode unavailable on Server 2. Switched to Server 1.");
      setSource("mal");
      return;
    }
    if (source === "mal") tryAnikotoFallback();
  }, [stream.error, source, tryAnikotoFallback]);

  // Also trigger fallback when the player itself reports an error via postMessage
  useEffect(() => {
    if (!iframeError) return;
    if (source === "mal" && !autoFallbackTried) {
      tryAnikotoFallback();
    }
  }, [iframeError, source, autoFallbackTried, tryAnikotoFallback]);

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

  const communityLink = `/community?scope=anime&mal_id=${malId}${anime.data?.title ? `&title=${encodeURIComponent(anime.data.title_english || anime.data.title)}` : ""}`;

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = anime.data?.title_english || anime.data?.title || "Hey Anime";



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
        // If on MAL source, immediately try Anikoto fallback
        if (source === "mal") {
          tryAnikotoFallback();
        }
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

      if (roomCode && Date.now() >= suppressOutgoingUntil.current) {
        if (d.event === "play") {
          sendPlayerEvent({ type: "play" });
        } else if (d.event === "pause") {
          sendPlayerEvent({ type: "pause" });
        } else if (d.event === "seek" || d.event === "seeked") {
          const current = Number(d.currentTime ?? d.time ?? 0);
          if (Number.isFinite(current)) {
            sendPlayerEvent({ type: "seek", currentTime: current });
          }
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
          if (roomCode) {
            sendPlayerEvent({ type: "change_episode", episode: nextEpisodeNumber });
          }
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [user, malId, episode, nextEpisodeNumber, anime.data, roomCode, source, tryAnikotoFallback]);

  const playerSrc = lang === "hin" ? hindiEmbedUrl : stream.data?.embed_url;
  const streamErrored = lang === "hin" ? false : !!stream.error; // hindi has its own error handling
  const showFallback = !blocked.data?.blocked && (iframeError || streamErrored) && lang !== "hin";

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
          <Link to={roomCode ? `/rooms/${roomCode}` : "/"}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Link>
        </Button>

        {/* Controls & Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Player */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-cinematic ring-1 ring-border/60">
              {anime.isLoading || eps.isLoading || blocked.isLoading ? (
                <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                  Loading player…
                </div>
              ) : blocked.data?.blocked ? (
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
                    This episode is not currently available on the streaming provider.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 text-xs">
                    <button
                      onClick={() => stream.refetch()}
                      className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Try Again
                    </button>
                    {source === "mal" && (
                      <button
                        onClick={() => {
                          toast.loading("Checking Server 2...", { id: "fallback-check" });
                          api.anikotoResolve(malId).then((res) => {
                            if (res.anikoto_id) {
                              setAnikotoId(res.anikoto_id);
                              setSource("anikoto");
                              toast.success(`Found on Server 2!`, { id: "fallback-check" });
                            } else {
                              toast.error("Not available on Server 2 either", { id: "fallback-check" });
                            }
                          }).catch(() => {
                            toast.error("Server 2 check failed", { id: "fallback-check" });
                          });
                        }}
                        className="px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80"
                      >
                        Try Server 2
                      </button>
                    )}
                  </div>
                  <a
                    href="https://megaplay.buzz/api#mal-anilist-coverage"
                    target="_blank" rel="noreferrer"
                    className="text-xs text-primary hover:underline mt-4 inline-flex items-center gap-1"
                  >
                    Check coverage → <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : isUpcoming ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-3 bg-gradient-to-b from-background/20 to-background/80">
                  <AlertTriangle className="w-10 h-10 text-primary" />
                  <p className="font-display text-2xl">Coming soon</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    This title has not aired yet. We'll show the player when it starts airing.
                  </p>
                </div>
              ) : lang === "hin" && hindiLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-28 h-28">
                      <video src="/loading.webm" autoPlay loop muted playsInline className="w-full h-full object-contain" />
                    </div>
                    <p className="text-sm text-muted-foreground">Finding Hindi dub…</p>
                  </div>
                </div>
              ) : lang === "hin" && hindiAvailable === false ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-3">
                  <AlertTriangle className="w-10 h-10 text-primary" />
                  <p className="font-display text-2xl">Hindi dub unavailable</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    This anime doesn't have a Hindi dub yet. Switching to SUB.
                  </p>
                  <button
                    onClick={() => setLang("sub")}
                    className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90"
                  >
                    Watch in SUB
                  </button>
                </div>
              ) : lang === "hin" && playerSrc ? (
                <HindiPlayer src={playerSrc} />
              ) : !playerSrc ? (
                <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                  Loading player…
                </div>
              ) : (
                <>
                  <iframe
                    ref={iframeRef}
                    key={playerSrc}
                    src={playerSrc}
                    title="Player"
                    allowFullScreen
                    allow="autoplay; fullscreen; picture-in-picture"
                    referrerPolicy="origin"
                    className="absolute inset-0 w-full h-full"
                    onError={() => setIframeError(true)}
                    onLoad={() => {
                      setIframeLoading(false);
                      if (searchParams.get("autoplay") === "1") {
                        window.setTimeout(() => {
                          iframeRef.current?.contentWindow?.postMessage({ event: "play" }, "*");
                        }, 250);
                      }
                    }}
                  />
                  {iframeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-28 h-28">
                          <video
                            src="/loading.webm"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">Loading player...</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Player toolbar — now below the player */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <SegmentedToggle
                label={<><Languages className="w-3.5 h-3.5" /> Lang</>}
                value={lang}
                onChange={(v) => {
                  const newLang = v as Lang;
                  setLang(newLang);
                  // Reset hindi embed when switching away or back
                  if (newLang !== "hin") setHindiEmbedUrl(null);
                  // Reset iframe error when switching lang
                  setIframeError(false);
                }}
                options={[
                  { value: "sub", label: "SUB" },
                  {
                    value: "dub",
                    label: "DUB",
                    disabled: !!streamOptions.data && !streamOptions.data.has_dub,
                    title: streamOptions.data && !streamOptions.data.has_dub ? "Dub unavailable for this title" : undefined,
                  },
                  {
                    value: "hin",
                    label: hindiLoading && hindiAvailable === null ? "HIN…" : "HIN",
                    disabled: hindiAvailable === false,
                    title: hindiAvailable === false
                      ? "Hindi dub not available for this title"
                      : hindiAvailable === null
                      ? "Checking Hindi dub availability…"
                      : "Watch in Hindi dub",
                  },
                ]}
              />
              {streamOptions.data?.has_uncensored ? (
                <SegmentedToggle
                  label={<><Tv className="w-3.5 h-3.5" /> Version</>}
                  value={version}
                  onChange={(v) => setVersion(v as Version)}
                  options={[
                    { value: "default", label: "Default" },
                    { value: "uncensored", label: "Uncensored" },
                  ]}
                />
              ) : null}
              {lang !== "hin" && (
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
              )}
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
              <Button asChild size="sm" variant="ghost" className="h-8 px-2" title="Open community discussion">
                <Link to={communityLink}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Discuss
                </Link>
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

            {scheduleBanner && (
              <div className="mt-3 rounded-lg bg-secondary/40 ring-1 ring-border/50 px-4 py-2 text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">Next episode:</span>
                <span>Episode {scheduleBanner.episode}</span>
                <span>•</span>
                <span>{scheduleBanner.label || "Coming soon"}</span>
                <span>•</span>
                <span>{scheduleBanner.subtitle}</span>
              </div>
            )}

            {/* Share & Watch Party */}
            {anime.data && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground flex items-center gap-1 mr-1">
                  <Share2 className="w-3.5 h-3.5" /> Share:
                </span>
                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Watching ${shareTitle} on Hey Anime`)}&url=${encodeURIComponent(pageUrl)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2.5 py-1.5 hover:bg-secondary transition-colors"
                  title="Share on X"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X
                </a>
                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2.5 py-1.5 hover:bg-secondary transition-colors"
                  title="Share on Facebook"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Watching ${shareTitle} on Hey Anime: ${pageUrl}`)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2.5 py-1.5 hover:bg-secondary transition-colors"
                  title="Share on WhatsApp"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(`Watching ${shareTitle} on Hey Anime`)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2.5 py-1.5 hover:bg-secondary transition-colors"
                  title="Share on Telegram"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </a>
                {/* Reddit */}
                <a
                  href={`https://www.reddit.com/submit?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(`Watching ${shareTitle} on Hey Anime`)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2.5 py-1.5 hover:bg-secondary transition-colors"
                  title="Share on Reddit"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                  Reddit
                </a>
                {/* Copy Link */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pageUrl).then(() => {
                      toast.success("Link copied to clipboard");
                    }).catch(() => {
                      toast.error("Could not copy link");
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2.5 py-1.5 hover:bg-secondary transition-colors"
                  title="Copy link"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Copy link
                </button>
                {/* Watch Party */}
                <span className="text-muted-foreground ml-2">|</span>
                <span className="text-muted-foreground">Watch party:</span>
                <Link
                  to={`/rooms?mal_id=${malId}&episode=${episode}${anime.data.title ? `&title=${encodeURIComponent(anime.data.title_english || anime.data.title)}` : ""}`}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2.5 py-1.5 hover:bg-secondary transition-colors"
                >
                  Create room
                </Link>
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
                {isUpcoming ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Coming soon. This anime has not aired yet.
                  </div>
                ) : episodeList.map((ep, i) => {
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

// ─── HindiPlayer — plays m3u8 streams from Tatakai/Consumet ─────────────────
// Uses native HLS via browser (Safari) or dynamically loads hls.js for others.

const HindiPlayer: React.FC<{ src: string }> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari supports HLS natively
      video.src = src;
      video.play().catch(() => {});
      return;
    }

    // Dynamically import hls.js for other browsers
    import("https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js" as any)
      .catch(() => null)
      .then((mod) => {
        const Hls = mod?.default ?? (window as any).Hls;
        if (!Hls || !Hls.isSupported()) {
          // Last resort — try assigning directly
          video.src = src;
          video.play().catch(() => {});
          return;
        }
        const hls = new Hls({ enableWorker: false });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        return () => hls.destroy();
      });
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full bg-black"
      style={{ objectFit: "contain" }}
    />
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null; info: React.ErrorInfo | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console and set state so we can render helpful UI
    // This will surface runtime exceptions that would otherwise cause a blank page
    // User can copy the error text for debugging
    console.error("Watch page runtime error:", error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-3xl w-full bg-card/80 ring-1 ring-border/60 rounded-lg p-6">
            <h2 className="font-display text-xl font-semibold mb-3">Something went wrong loading the player</h2>
            <p className="text-sm text-muted-foreground mb-4">An unexpected error occurred while rendering the Watch page. The error is shown below — please paste it into the chat or the browser console.</p>
            <pre className="whitespace-pre-wrap text-xs bg-background/50 p-3 rounded text-red-400 overflow-auto" style={{ maxHeight: 300 }}>
              {String(this.state.error?.message) + (this.state.info?.componentStack ? "\n\n" + this.state.info.componentStack : "")}
            </pre>
            <div className="mt-4 flex gap-2">
              <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded bg-primary text-primary-foreground">Reload page</button>
              <button onClick={() => { this.setState({ error: null, info: null }); window.history.back(); }} className="px-3 py-1.5 rounded bg-secondary">Go back</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

const WatchPage = () => (
  <ErrorBoundary>
    <Watch />
  </ErrorBoundary>
);

export default WatchPage;
