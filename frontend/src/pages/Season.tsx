import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { AdSlot } from "@/components/AdSlot";
import { jikan } from "@/lib/jikan";

/* ─── Types ─────────────────────────────────────────────── */
interface AnimeItem {
  mal_id: number;
  title: string;
  images?: { jpg?: { large_image_url?: string } };
  score?: number;
  episodes?: number;
  genres?: { name: string }[];
}

/* ─── Skeleton card ─────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="animate-pulse flex flex-col gap-3">
    <div className="aspect-[3/4] rounded-xl bg-muted/40" />
    <div className="h-3 w-3/4 rounded bg-muted/40" />
    <div className="h-3 w-1/2 rounded bg-muted/30" />
  </div>
);

/* ─── Anime card ─────────────────────────────────────────── */
const AnimeCard = ({ item, index }: { item: AnimeItem; index: number }) => {
  const img = item.images?.jpg?.large_image_url;
  return (
    <article
      className="group relative flex flex-col gap-3 cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Poster */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted/20 shadow-md">
        {img ? (
          <img
            src={img}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted/30" />
        )}

        {/* Live / airing pill */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-sm px-2 py-0.5 shadow">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          <span className="text-[10px] font-semibold text-primary leading-none">AIRING</span>
        </div>

        {/* Score badge */}
        {item.score && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-primary shadow">
            ★ {item.score.toFixed(1)}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="flex flex-wrap gap-1">
            {item.genres?.slice(0, 2).map((g) => (
              <span
                key={g.name}
                className="text-[10px] bg-primary/90 text-primary-foreground rounded px-1.5 py-0.5 leading-none"
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div>
        <p className="font-display font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </p>
        {item.episodes && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.episodes} eps</p>
        )}
      </div>
    </article>
  );
};

/* ─── Page ───────────────────────────────────────────────── */
const Season = () => {
  useEffect(() => {
    document.title = "This Season — Hey Anime";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Watch anime currently airing this season.");
  }, []);

  const { data, isLoading } = useQuery<AnimeItem[]>({
    queryKey: ["season"],
    queryFn: jikan.seasonNow,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-28 pb-24">

        {/* ── Hero header ── */}
        <header className="relative mb-14 overflow-hidden">
          {/* Decorative oversized background word */}
          <span
            aria-hidden
            className="pointer-events-none select-none absolute -top-6 -left-4 font-display font-black text-[clamp(5rem,18vw,14rem)] leading-none text-primary/5 tracking-tighter"
          >
            NOW
          </span>

          <div className="relative z-10 pt-6">
            <div className="flex items-center gap-3 mb-4">
              {/* Pulsing live dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <p className="text-xs uppercase tracking-[0.3em] text-primary font-medium">
                Currently airing
              </p>
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight">
              This season
            </h1>
            <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
              Anime premiering and airing right now — catch them before everyone else does.
            </p>
          </div>

          {/* Thin rule */}
          <div className="mt-10 h-px w-full bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
        </header>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 animate-in fade-in duration-500">
            {(data ?? []).map((item, i) => (
              <AnimeCard key={item.mal_id} item={item} index={i} />
            ))}
          </div>
        )}

        {/* ── Ad slot ── */}
        <div className="my-16 max-w-3xl mx-auto">
          <AdSlot slot="season-mid" className="mt-6" />
        </div>
      </main>
    </div>
  );
};

export default Season;
