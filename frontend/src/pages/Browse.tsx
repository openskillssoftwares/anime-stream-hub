import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2, X } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimeCard } from "@/components/AnimeCard";
import { jikan, rankSearchResults, type Anime } from "@/lib/jikan";

const TYPE_OPTIONS = ["", "tv", "movie", "ova", "ona", "special"] as const;
const STATUS_OPTIONS = ["", "airing", "complete", "upcoming"] as const;
const ORDER_OPTIONS = [
  { value: "score", label: "Top score" },
  { value: "popularity", label: "Most popular" },
  { value: "start_date", label: "Newest" },
  { value: "title", label: "A → Z" },
];

const Browse = () => {
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState(params.get("q") || "");
  const [type, setType] = useState(params.get("type") || "");
  const [status, setStatus] = useState(params.get("status") || "");
  const [order, setOrder] = useState(params.get("order_by") || "score");
  const [genres, setGenres] = useState<number[]>(() =>
    (params.get("genres") || "").split(",").map((s) => Number(s)).filter(Boolean));
  const [page, setPage] = useState(Number(params.get("page") || 1));

  useEffect(() => { document.title = "Browse — Lumen"; }, []);

  // sync url
  useEffect(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (type) u.set("type", type);
    if (status) u.set("status", status);
    if (order && order !== "score") u.set("order_by", order);
    if (genres.length) u.set("genres", genres.join(","));
    if (page > 1) u.set("page", String(page));
    setParams(u, { replace: true });
  }, [q, type, status, order, genres, page, setParams]);

  const genreList = useQuery({
    queryKey: ["genres"],
    queryFn: () => jikan.genres(),
    staleTime: 24 * 60 * 60_000,
  });

  const results = useQuery({
    queryKey: ["browse", q, type, status, order, genres.join(","), page],
    queryFn: (): Promise<Anime[]> => jikan.byFilters({
      q: q || undefined,
      type: type || undefined,
      status: status || undefined,
      order_by: order,
      sort: "desc",
      genres: genres.length ? genres : undefined,
      page,
      limit: 24,
    }),
    placeholderData: (prev) => prev,
  });

  const orderedResults: Anime[] = results.data && q ? rankSearchResults(results.data, q) : (results.data || []);

  const toggleGenre = (id: number) => {
    setGenres((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
    setPage(1);
  };
  const clearAll = () => {
    setQ(""); setType(""); setStatus(""); setOrder("score"); setGenres([]); setPage(1);
  };

  const hasFilters = q || type || status || genres.length > 0 || order !== "score";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" /> Browse
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold">Find your next obsession</h1>
        </motion.div>

        {/* filter bar */}
        <div className="mt-8 grid lg:grid-cols-[1fr_auto_auto_auto] gap-3">
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search title…"
            className="bg-secondary/50 border-border/60"
          />
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
                  className="h-10 px-3 rounded-md bg-secondary/50 border border-border/60 text-sm">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t ? t.toUpperCase() : "Any type"}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="h-10 px-3 rounded-md bg-secondary/50 border border-border/60 text-sm">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : "Any status"}</option>)}
          </select>
          <select value={order} onChange={(e) => { setOrder(e.target.value); setPage(1); }}
                  className="h-10 px-3 rounded-md bg-secondary/50 border border-border/60 text-sm">
            {ORDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* genre chips */}
        {genreList.data && genreList.data.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {genreList.data.slice(0, 30).map((g) => {
              const active = genres.includes(g.mal_id);
              return (
                <button
                  key={g.mal_id}
                  onClick={() => toggleGenre(g.mal_id)}
                  className={`px-3 py-1 rounded-full text-xs ring-1 transition-all ${
                    active
                      ? "bg-gradient-ember text-primary-foreground ring-transparent shadow-glow"
                      : "bg-secondary/50 text-foreground/85 ring-border/50 hover:ring-primary/60"
                  }`}
                >{g.name}</button>
              );
            })}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 px-2 ml-2 text-muted-foreground">
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        )}

        {/* active filter pills */}
        {(q || type || status) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {q && <Badge variant="secondary">Search: {q}</Badge>}
            {type && <Badge variant="secondary">{type.toUpperCase()}</Badge>}
            {status && <Badge variant="secondary">{status}</Badge>}
          </div>
        )}

        {/* grid */}
        <div className="mt-8">
          {results.isLoading ? (
            <div className="py-24 grid place-items-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : orderedResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {orderedResults.map((a) => (
                <AnimeCard key={a.mal_id} anime={a} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center text-muted-foreground italic">
              No results for these filters.
            </div>
          )}
        </div>

        {/* pagination */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={orderedResults.length < 24}
                  onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      </main>
    </div>
  );
};

export default Browse;
