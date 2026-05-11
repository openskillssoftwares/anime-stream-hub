import { motion } from "framer-motion";
import { Play, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import heroImg from "@/assets/hero-anime.jpg";
import type { Anime } from "@/lib/jikan";
import { FlameLottie } from "@/components/FlameLottie";
import { useEffect, useRef, useState } from "react";

export const Hero = ({ featuredList }: { featuredList?: Anime[] }) => {
  const list = featuredList && featuredList.length > 0 ? featuredList : undefined;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Reset index when list changes
  useEffect(() => {
    setIndex(0);
  }, [list]);

  // Auto-advance
  useEffect(() => {
    if (!list || list.length === 0) return;
    if (paused) return;

    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, 7000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [list, paused]);

  const active = list ? list[index] : undefined;
  const bg = active?.images?.jpg?.large_image_url || heroImg;
  const title = active?.title_english || active?.title || "Forgetting is like a wound. The wound may heal, but it has already left a scar. -Monkey D. Luffy, One Piece";

  return (
    <section
      className="relative h-[85vh] min-h-[600px] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0">
        <img src={bg} alt={active ? `${title} backdrop` : "Cinematic anime hero"} className="w-full h-full object-cover animate-slow-pan" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-grain opacity-40 mix-blend-overlay" />
      </div>

      <div className="relative h-full container flex flex-col justify-end pb-24 md:pb-32">
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="absolute top-24 right-6 hidden md:block" aria-hidden>
          <FlameLottie size={120} />
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-xs md:text-sm uppercase tracking-[0.35em] text-primary mb-4">
          {list ? "Monthly featured top 10" : "An wonderful editorial anime experience"}
        </motion.p>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold max-w-4xl text-balance leading-[1.05]">
          {title}
        </motion.h1>

        {active?.synopsis && (
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35 }} className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground line-clamp-3">
            {active.synopsis}
          </motion.p>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="mt-8 flex flex-wrap gap-3 items-center">
          {active ? (
            <>
              <Button asChild size="lg" className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-8">
                <Link to={`/watch/${active.mal_id}?ep=1`}><Play className="w-4 h-4 mr-2 fill-current" /> Watch now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-border/60 glass">
                <Link to={`/watch/${active.mal_id}?ep=1`}><Info className="w-4 h-4 mr-2" /> More info</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg" className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-8">
              <a href="#trending"><Play className="w-4 h-4 mr-2 fill-current" /> Start exploring</a>
            </Button>
          )}

          {list && list.length > 0 && (
            <div className="mt-8 w-full">
              <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-2">
                  {list.map((item, i) => {
                    const isActive = i === index;
                    const thumb = item.images?.jpg?.image_url || item.images?.jpg?.large_image_url || heroImg;
                    return (
                      <CarouselItem key={item.mal_id} className="pl-2 basis-1/4 sm:basis-1/6 md:basis-1/8 lg:basis-1/10">
                        <button
                          onClick={(e) => { e.preventDefault(); setIndex(i); }}
                          className={`group relative block w-full overflow-hidden rounded-md transition-all ${isActive ? "ring-2 ring-primary" : "ring-1 ring-border/50"}`}
                          title={item.title_english || item.title}
                        >
                          <img src={thumb} alt={item.title} className="w-full h-[120px] object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">#{i + 1}</div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-xs text-white line-clamp-2">{item.title_english || item.title}</p>
                          </div>
                        </button>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex -left-4" />
                <CarouselNext className="hidden sm:flex -right-4" />
              </Carousel>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};
