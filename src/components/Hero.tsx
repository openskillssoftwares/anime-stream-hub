import { motion } from "framer-motion";
import { Play, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-anime.jpg";
import type { Anime } from "@/lib/jikan";

export const Hero = ({ featured }: { featured?: Anime }) => {
  const bg = featured?.images.jpg.large_image_url || heroImg;
  const title = featured?.title_english || featured?.title || "Stories worth losing sleep over.";

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={bg}
          alt={featured ? `${title} backdrop` : "Cinematic anime hero"}
          className="w-full h-full object-cover animate-slow-pan"
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-grain opacity-40 mix-blend-overlay" />
      </div>

      <div className="relative h-full container flex flex-col justify-end pb-24 md:pb-32">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-xs md:text-sm uppercase tracking-[0.35em] text-primary mb-4"
        >
          {featured ? "Now featured" : "An editorial anime experience"}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold max-w-4xl text-balance leading-[1.05]"
        >
          {title}
        </motion.h1>
        {featured?.synopsis && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground line-clamp-3"
          >
            {featured.synopsis}
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          {featured ? (
            <>
              <Button asChild size="lg" className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-8">
                <Link to={`/watch/${featured.mal_id}`}><Play className="w-4 h-4 mr-2 fill-current" /> Watch now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-border/60 glass">
                <Link to={`/watch/${featured.mal_id}`}><Info className="w-4 h-4 mr-2" /> More info</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg" className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-8">
              <a href="#trending"><Play className="w-4 h-4 mr-2 fill-current" /> Start exploring</a>
            </Button>
          )}
        </motion.div>
      </div>
    </section>
  );
};
