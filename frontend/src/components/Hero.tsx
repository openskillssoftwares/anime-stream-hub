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
  // "airing" filter returns the top currently-airing anime — effectively this season/month's best
  const res = await fetch("https://api.jikan.moe/v4/top/anime?limit=10&filter=airing");
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
                  {featuredList?.length ? "Monthly featured top 10" : `Top 10 This Month — ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`}
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
        <div className="mt-10 w-full">
          {loadingTop10 && !featuredList?.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading top anime…
            </div>
          ) : list.length > 0 ? (
            <div className="relative group/slider">

              {/* Left fade + arrow */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background/60 to-transparent z-10 flex items-center justify-start pl-1 opacity-0 group-hover/slider:opacity-100 transition-opacity">
                <button
                  onClick={prev}
                  className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Right fade + arrow */}
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/60 to-transparent z-10 flex items-center justify-end pr-1 opacity-0 group-hover/slider:opacity-100 transition-opacity">
                <button
                  onClick={next}
                  className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Cards row */}
              <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 px-0.5">
                {list.map((item, i) => {
                  const isActive = i === index;
                  const thumb = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || heroImg;
                  return (
                    <button
                      key={item.mal_id}
                      onClick={() => goTo(i)}
                      title={item.title_english || item.title}
                      className={`group/card relative shrink-0 flex items-end rounded-xl overflow-hidden transition-all duration-300 ${
                        isActive
                          ? "w-[160px] md:w-[180px] ring-2 ring-primary shadow-glow opacity-100"
                          : "w-[110px] md:w-[130px] ring-1 ring-white/10 opacity-50 hover:opacity-80 hover:ring-white/30"
                      }`}
                      style={{ height: "180px" }}
                    >
                      {/* Cover image */}
                      <img
                        src={thumb}
                        alt={item.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                      />

                      {/* Dark overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      {/* Rank number — large, stylised */}
                      <span className={`absolute top-2 left-2.5 font-display font-black leading-none select-none transition-all ${
                        isActive ? "text-3xl text-primary drop-shadow-lg" : "text-2xl text-white/40"
                      }`}>
                        {i + 1}
                      </span>

                      {/* Score top-right */}
                      {item.score && (
                        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 rounded-full px-1.5 py-0.5">
                          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-[10px] text-yellow-300 font-semibold">{item.score.toFixed(1)}</span>
                        </div>
                      )}

                      {/* Bottom info */}
                      <div className="relative w-full p-2.5 z-10">
                        <p className={`font-medium leading-tight transition-all ${
                          isActive ? "text-xs text-white line-clamp-2" : "text-[10px] text-white/70 line-clamp-1"
                        }`}>
                          {item.title_english || item.title}
                        </p>

                        {/* Watch button — only on active */}
                        {isActive && (
                          <Link
                            to={`/watch/${item.mal_id}?ep=1`}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary/90 hover:bg-primary py-1 text-[11px] font-semibold text-primary-foreground transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" /> Watch now
                          </Link>
                        )}
                      </div>

                      {/* Active progress bar */}
                      {isActive && (
                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/10">
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
