import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Star, Tv, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroImg from "@/assets/hero-anime.jpg";
import type { Anime } from "@/lib/jikan";
import { FlameLottie } from "@/components/FlameLottie";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Fetch top 10 directly from Jikan ────────────────────────────────────────

const fetchTop10 = async (): Promise<Anime[]> => {
  const res = await fetch("https://api.jikan.moe/v4/top/anime?limit=10&filter=bypopularity");
  if (!res.ok) throw new Error("Failed to fetch top anime");
  const json = await res.json();
  return json.data as Anime[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Hero = ({ featuredList }: { featuredList?: Anime[] }) => {
  const [top10, setTop10] = useState<Anime[]>([]);
  const [loadingTop10, setLoadingTop10] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const timerRef = useRef<number | null>(null);

  // Use passed-in list or fall back to our own fetch
  const list = (featuredList && featuredList.length > 0 ? featuredList : top10);

  // Fetch top 10 if no featuredList provided
  useEffect(() => {
    if (featuredList && featuredList.length > 0) {
      setLoadingTop10(false);
      return;
    }
    setLoadingTop10(true);
    fetchTop10()
      .then((data) => setTop10(data))
      .catch(() => setTop10([]))
      .finally(() => setLoadingTop10(false));
  }, [featuredList]);

  // Reset index when list changes
  useEffect(() => { setIndex(0); }, [list]);

  // Auto-advance every 7s
  useEffect(() => {
    if (!list.length || paused) return;
    timerRef.current = window.setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % list.length);
    }, 7000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [list, paused]);

  const goTo = useCallback((i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  }, [index]);

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + list.length) % list.length);
  }, [list.length]);

  const next = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % list.length);
  }, [list.length]);

  const active = list[index];
  const bg = active?.images?.jpg?.large_image_url || heroImg;
  const title = active?.title_english || active?.title
    || "Forgetting is like a wound. The wound may heal, but it has already left a scar. — Monkey D. Luffy";

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
  };

  return (
    <section
      className="relative h-[90vh] min-h-[640px] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Background ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={bg}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={bg}
            alt={active ? `${title} backdrop` : "Cinematic anime hero"}
            className="w-full h-full object-cover animate-slow-pan"
          />
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-grain opacity-30 mix-blend-overlay" />
        </motion.div>
      </AnimatePresence>

      {/* ── Flame decoration ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute top-24 right-6 hidden md:block"
        aria-hidden
      >
        <FlameLottie size={120} />
      </motion.div>

      {/* ── Main content ── */}
      <div className="relative h-full container flex flex-col justify-end pb-8 md:pb-12">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active?.mal_id ?? "default"}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="max-w-2xl"
          >
            {/* Rank badge */}
            {list.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs uppercase tracking-[0.35em] text-primary">
                  {featuredList?.length ? "Monthly featured top 10" : "Top 10 Most Popular"}
                </span>
                {active && (
                  <span className="font-display text-5xl md:text-7xl font-bold text-white/10 select-none leading-none">
                    #{index + 1}
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            <h1 className="font-display text-4xl md:text-6xl lg:text-5xl font-semibold text-balance leading-[1.05]">
              {title}
            </h1>

            {/* Meta row */}
            {active && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {active.score && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    {active.score.toFixed(2)}
                  </span>
                )}
                {active.year && <span>{active.year}</span>}
                {active.episodes && (
                  <span className="flex items-center gap-1">
                    <Tv className="w-3.5 h-3.5" /> {active.episodes} eps
                  </span>
                )}
                {active.status && <span className="opacity-70">• {active.status}</span>}
                {(active.genres || []).slice(0, 3).map((g) => (
                  <Badge key={g.name} variant="secondary" className="bg-white/10 text-white/80 border-0 text-xs">
                    {g.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Synopsis */}
            {active?.synopsis && (
              <p className="mt-4 max-w-xl text-sm md:text-base text-muted-foreground line-clamp-2 leading-relaxed">
                {active.synopsis}
              </p>
            )}

            {/* CTA buttons */}
            <div className="mt-6 flex flex-wrap gap-3 items-center">
              {active ? (
                <>
                  <Button
                    asChild size="lg"
                    className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-8"
                  >
                    <Link to={`/watch/${active.mal_id}?ep=1`}>
                      <Play className="w-4 h-4 mr-2 fill-current" /> Watch now
                    </Link>
                  </Button>
                  <Button
                    asChild size="lg" variant="outline"
                    className="rounded-full px-8 border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur"
                  >
                    <Link to={`/watch/${active.mal_id}`}>
                      <Info className="w-4 h-4 mr-2" /> More info
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  asChild size="lg"
                  className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-8"
                >
                  <a href="#trending"><Play className="w-4 h-4 mr-2 fill-current" /> Start exploring</a>
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Top 10 Slider ── */}
        <div className="mt-8 w-full">
          {loadingTop10 && !featuredList?.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading top anime…
            </div>
          ) : list.length > 0 ? (
            <div className="relative">
              {/* Prev/Next arrows */}
              <button
                onClick={prev}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors hidden sm:flex"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={next}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors hidden sm:flex"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Thumbnails scroll container */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-1">
                {list.map((item, i) => {
                  const isActive = i === index;
                  const thumb = item.images?.jpg?.image_url || item.images?.jpg?.large_image_url || heroImg;
                  return (
                    <button
                      key={item.mal_id}
                      onClick={() => goTo(i)}
                      title={item.title_english || item.title}
                      className={`group relative shrink-0 w-[80px] sm:w-[90px] md:w-[100px] overflow-hidden rounded-lg transition-all duration-300 ${
                        isActive
                          ? "ring-2 ring-primary scale-105 shadow-glow"
                          : "ring-1 ring-white/20 opacity-60 hover:opacity-100 hover:scale-102"
                      }`}
                    >
                      {/* Thumbnail */}
                      <img
                        src={thumb}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-[120px] sm:h-[130px] object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Rank badge */}
                      <div className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-black/70 text-white"
                      }`}>
                        #{i + 1}
                      </div>

                      {/* Score */}
                      {item.score && (
                        <div className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] text-yellow-400 font-semibold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-yellow-400" />
                          {item.score.toFixed(1)}
                        </div>
                      )}

                      {/* Title + Watch now overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5">
                        <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">
                          {item.title_english || item.title}
                        </p>
                        {isActive && (
                          <Link
                            to={`/watch/${item.mal_id}?ep=1`}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 flex items-center gap-0.5 text-[9px] text-primary font-semibold hover:underline"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" /> Watch
                          </Link>
                        )}
                      </div>

                      {/* Active progress bar */}
                      {isActive && (
                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: "0%" }}
                            animate={{ width: paused ? undefined : "100%" }}
                            transition={{ duration: 7, ease: "linear" }}
                            key={`${index}-${paused}`}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
