import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "./AnimeCard";
import type { Anime } from "@/lib/jikan";
import { motion } from "framer-motion";

interface Props {
  id?: string;
  title: string;
  eyebrow?: string;
  items: Anime[] | undefined;
  loading?: boolean;
  numbered?: boolean;
}

export const AnimeRow = ({ id, title, eyebrow, items, loading, numbered }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section id={id} className="container py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="flex items-end justify-between mb-5"
      >
        <div>
          {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-primary mb-1.5">{eyebrow}</p>}
          <h2 className="font-display text-3xl md:text-4xl font-semibold">{title}</h2>
        </div>
        <div className="hidden md:flex gap-2">
          <Button variant="outline" size="icon" onClick={() => scroll("left")} className="rounded-full border-border/60">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => scroll("right")} className="rounded-full border-border/60">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      <div ref={scrollRef} className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6 snap-x">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[180px] md:w-[210px]">
            <div className="aspect-[2/3] rounded-lg bg-secondary animate-pulse" />
            <div className="mt-3 h-4 bg-secondary rounded animate-pulse w-3/4" />
          </div>
        ))}
        {items?.map((a, i) => (
          <div key={a.mal_id} className="snap-start">
            <AnimeCard anime={a} rank={numbered ? i + 1 : undefined} />
          </div>
        ))}
      </div>
    </section>
  );
};
