import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Clock, X } from "lucide-react";
import { api, type ProgressRow } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ContinueWatchingRow = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const q = useQuery({
    queryKey: ["progress-me"],
    queryFn: () => api.myProgress(20),
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  useEffect(() => { if (q.data) setRows(q.data.filter((r) => !r.completed)); }, [q.data]);

  const onRemove = async (mal_id: number) => {
    try {
      await api.deleteProgress(mal_id);
      setRows((p) => p.filter((r) => r.mal_id !== mal_id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (!user || rows.length === 0) return null;

  return (
    <section className="container py-8" id="continue">
      <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1.5 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" /> Pick up where you left off
      </p>
      <h2 className="font-display text-2xl md:text-3xl font-semibold mb-5">Continue watching</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {rows.map((r, i) => {
          const pct = Math.max(2, Math.min(100, r.percent || 0));
          return (
            <motion.div
              key={`${r.mal_id}-${r.episode}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="group relative rounded-xl overflow-hidden bg-card/60 ring-1 ring-border/60 hover:ring-primary/60 transition-all"
            >
              <Link to={`/watch/${r.mal_id}?ep=${r.episode}`} className="block">
                <div className="aspect-[3/4] overflow-hidden bg-secondary">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title || `MAL #${r.mal_id}`}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">No art</div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-[11px] uppercase tracking-widest text-primary mb-1">Ep {r.episode}</p>
                  <p className="text-sm font-medium line-clamp-2">{r.title || `MAL #${r.mal_id}`}</p>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                  <div className="h-full bg-gradient-ember" style={{ width: `${pct}%` }} />
                </div>
                <div className="absolute top-2 left-2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4 fill-primary text-primary translate-x-0.5" />
                </div>
              </Link>
              <Button
                variant="ghost" size="icon"
                onClick={(e) => { e.preventDefault(); onRemove(r.mal_id); }}
                className="absolute top-2 right-2 h-7 w-7 bg-black/60 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
