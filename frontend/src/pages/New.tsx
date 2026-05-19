import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Filter, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AnimeRow } from "@/components/AnimeRow";
import { AdSlot } from "@/components/AdSlot";
import { jikan, type Anime } from "@/lib/jikan";

const SORT_OPTIONS = [
  { label: "Latest first", value: "latest" },
  { label: "Highest rated", value: "score" },
  { label: "Most episodes", value: "episodes" },
];

const New = () => {
  const [sort, setSort] = useState<"latest" | "score" | "episodes">("latest");
  const [filterGenre, setFilterGenre] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    document.title = "New Releases — Hey Anime";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Discover the latest anime releases.");
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["new"],
    queryFn: jikan.newReleases,
    staleTime: 5 * 60_000,
  });

  // Derived: all unique genres from results
  const genres = [...new Set(
    (data ?? []).flatMap((a) => (a.genres ?? []).map((g) => g.name))
  )].sort();

  // Apply sort + genre filter
  const filtered: Anime[] = [...(data ?? [])]
    .filter((a) => !filterGenre || (a.genres ?? []).some((g) => g.name === filterGenre))
    .sort((a, b) => {
      if (sort === "score") return (b.score ?? 0) - (a.score ?? 0);
      if (sort === "episodes") return (b.episodes ?? 0) - (a.episodes ?? 0);
      return 0; // latest: keep API order
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <main className="container relative z-10 pt-28 pb-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Hot off the press
          </p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-semibold">New Releases</h1>
              <p className="mt-2 text-muted-foreground max-w-xl">
                Latest anime hitting streaming platforms right now.
                {!isLoading && data && (
                  <span className="ml-2 text-primary font-medium">{filtered.length} titles</span>
                )}
              </p>
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 ring-1 ring-border/50 hover:ring-primary/40 text-sm transition-all"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl bg-card/50 ring-1 ring-border/40 flex flex-wrap gap-4 items-center"
            >
              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Sort</span>
                <div className="flex gap-1">
                  {SORT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setSort(o.value as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        sort === o.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre filter */}
              {genres.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Genre</span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setFilterGenre("")}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        !filterGenre
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      All
                    </button>
                    {genres.slice(0, 12).map((g) => (
                      <button
                        key={g}
                        onClick={() => setFilterGenre(g === filterGenre ? "" : g)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          filterGenre === g
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <AnimeRow items={filtered} loading={isLoading} />
        </motion.div>

        {!isLoading && filtered.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-lg">No results for this filter.</p>
            <button
              onClick={() => { setFilterGenre(""); setSort("latest"); }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="my-12 max-w-3xl mx-auto">
          <AdSlot slot="new-mid" className="mt-6" />
        </div>
      </main>
    </div>
  );
};

export default New;
