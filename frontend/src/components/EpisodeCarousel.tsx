import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { AnimeEpisode } from "@/lib/jikan";

interface EpisodeCarouselProps {
  episodes: AnimeEpisode[];
  currentEpisode: number;
  onEpisodeSelect: (episode: number) => void;
  animeTitle?: string;
  animeImage?: string;
}

export const EpisodeCarousel = ({
  episodes,
  currentEpisode,
  onEpisodeSelect,
  animeTitle = "Episode",
  animeImage,
}: EpisodeCarouselProps) => {
  const [api, setApi] = useState<any>(null);

  // Auto-scroll to current episode in carousel
  useEffect(() => {
    if (api) {
      const currentIndex = episodes.findIndex((ep) => ep.episodeNumber === currentEpisode);
      if (currentIndex >= 0) {
        api.scrollTo(currentIndex, false);
      }
    }
  }, [currentEpisode, api, episodes]);

  if (episodes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Main display - current episode */}
      <motion.div
        key={currentEpisode}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative w-full aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-border/60"
      >
        {animeImage ? (
          <img
            src={animeImage}
            alt={animeTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-display font-semibold text-primary">Episode {currentEpisode}</p>
              <p className="text-muted-foreground mt-2">{animeTitle}</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">
            Episode {currentEpisode}
          </p>
          <h3 className="text-lg font-semibold text-white line-clamp-2">
            {episodes[episodes.findIndex((ep) => ep.episodeNumber === currentEpisode)]?.title ||
              `Episode ${currentEpisode}`}
          </h3>
        </div>
      </motion.div>

      {/* Thumbnail carousel */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Episodes • {episodes.length} total
        </p>
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {episodes.map((ep, idx) => {
              const num = ep.episodeNumber || idx + 1;
              const isActive = num === currentEpisode;
              return (
                <CarouselItem
                  key={`${ep.mal_id}-${num}`}
                  className="pl-2 md:pl-4 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onEpisodeSelect(num)}
                    className={`relative w-full aspect-video rounded-lg overflow-hidden ring-2 transition-all ${
                      isActive
                        ? "ring-primary shadow-glow"
                        : "ring-border/40 hover:ring-border/80"
                    }`}
                  >
                    {/* Placeholder gradient for thumbnail */}
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex items-center justify-center">
                      <span className="text-xs font-mono font-semibold text-foreground/60">
                        {String(num).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Overlay with number */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">Ep {num}</p>
                      </div>
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-ember opacity-20" />
                    )}
                  </motion.button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-12 md:-left-14" />
          <CarouselNext className="hidden sm:flex -right-12 md:-right-14" />
        </Carousel>
        <p className="text-xs text-muted-foreground text-center">
          Scroll or use arrows to browse episodes
        </p>
      </div>
    </div>
  );
};
