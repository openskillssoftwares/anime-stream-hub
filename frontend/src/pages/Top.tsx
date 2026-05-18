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
  <div className="animate-pulse flex gap-4 p-4 rounded-2xl border border-muted/20">
    <div className="shrink-0 w-8 h-8 rounded bg-muted/40 self-center" />
    <div className="aspect-[3/4] w-24 shrink-0 rounded-xl bg-muted/40" />
    <div className="flex flex-col gap-2 justify-center flex-1">
      <div className="h-4 w-3/4 rounded bg-muted/40" />
      <div className="h-3 w-1/3 rounded bg-muted/30" />
      <div className="h-3 w-1/2 rounded bg-muted/20" />
    </div>
  </div>
);

/* ─── Top card (horizontal list item) ───────────────────── */
const TopCard = ({ item, rank }: { item: AnimeItem; rank: number }) => {
  const img = item.images?.jpg?.large_image_url;
  const isTop3 = rank <= 3;

  return (
    <article className="group flex items-center gap-5 p-4 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all duration-300 cursor-pointer">
      {/* Rank number */}
      <span
        className={`
          shrink-0 font-display font-black tabular-nums leading-none select-none
          ${isTop3
            ? "text-4xl text-primary w-10 text-right"
            : "text-2xl text-muted-foreground/40 w-10 text-right"
          }
        `}
      >
        {rank}
      </span>

      {/* Poster thumbnail */}
      <div className="relative shrink-0 w-16 aspect-[3/4] rounded-lg overflow-hidden shadow-sm bg-muted/20">
        {img ? (
          <img
            src={img}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted/30" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm md:text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {item.score && (
            <span className="text-xs text-primary font-medium flex items-center gap-1">
              ★ {item.score.toFixed(1)}
            </span>
          )}
          {item.episodes && (
            <span className="text-xs text-muted-foreground">{item.episodes} eps</span>
          )}
          {item.genres?.slice(0, 2).map((g) => (
            <span key={g.name} className="text-xs text-muted-foreground/70 bg-muted/30 rounded px-1.5 py-0.5 leading-none">
              {g.name}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
};

/* ─── Page ───────────────────────────────────────────────── */
const Top = () => {
  useEffect(() => {
    document.title = "Top 10 — Hey Anime";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "The highest-rated anime of all time.");
  }, []);

  const { data, isLoading } = useQuery<AnimeItem[]>({
    queryKey: ["top"],
    queryFn: jikan.topAll,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-28 pb-24">

        {/* ── Hero header ── */}
        <header className="relative mb-14 overflow-hidden">
          {/* Decorative oversized background label */}
          <span
            aria-hidden
            className="pointer-events-none select-none absolute -top-6 -left-4 font-display font-black text-[clamp(5rem,18vw,14rem)] leading-none text-primary/5 tracking-tighter"
          >
            TOP
          </span>

          <div className="relative z-10 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-block w-8 h-px bg-primary" />
              <p className="text-xs uppercase tracking-[0.3em] text-primary font-medium">
                All time
              </p>
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight">
              Top 10
            </h1>
            <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
              The highest-rated anime across all genres and eras — ranked by community score.
            </p>
          </div>

          {/* Thin rule */}
          <div className="mt-10 h-px w-full bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
        </header>

        {/* ── Ranked list ── */}
        <div className="max-w-2xl flex flex-col gap-1">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            : (data ?? []).slice(0, 10).map((item, i) => (
                <TopCard key={item.mal_id} item={item} rank={i + 1} />
              ))
          }
        </div>

        {/* ── Ad slot ── */}
        <div className="my-16 max-w-3xl mx-auto">
          <AdSlot slot="top-mid" className="mt-6" />
        </div>
      </main>
    </div>
  );
};

export default Top;
