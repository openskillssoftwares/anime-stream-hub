import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Play } from "lucide-react";
import type { Anime } from "@/lib/jikan";

export const AnimeCard = ({ anime, rank, compact }: { anime: Anime; rank?: number; compact?: boolean }) => {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative shrink-0 ${compact ? "w-[150px] md:w-[180px]" : "w-[180px] md:w-[210px]"}`}
    >
      <Link to={`/watch/${anime.mal_id}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-card shadow-card">
          <img
            src={anime.images.jpg.large_image_url}
            alt={anime.title}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
          {rank && (
            <div className={`absolute top-2 left-2 font-display font-extrabold text-foreground/95 leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${compact ? "text-4xl" : "text-5xl"}`}>
              {rank}
            </div>
          )}
          {anime.score && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md glass text-xs font-medium">
              <Star className="w-3 h-3 fill-primary text-primary" /> {anime.score.toFixed(1)}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-primary/95 flex items-center justify-center shadow-glow">
              <Play className="w-5 h-5 fill-primary-foreground text-primary-foreground ml-0.5" />
            </div>
          </div>
        </div>
        <div className={`mt-3 px-0.5 ${compact ? "max-w-[180px]" : ""}`}>
          <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {anime.title_english || anime.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {anime.type || "TV"} {anime.episodes ? `• ${anime.episodes} eps` : ""} {anime.year ? `• ${anime.year}` : ""}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};
