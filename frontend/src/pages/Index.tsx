import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AnimeRow } from "@/components/AnimeRow";
import { AdSlot } from "@/components/AdSlot";
import { Schedule } from "@/components/Schedule";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { jikan } from "@/lib/jikan";

const Index = () => {
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  useEffect(() => {
    document.title = "Hey Anime — Stream anime, track progress, join the discussion";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Stream trending, top-rated and seasonal anime in a cinematic editorial experience.");
  }, []);

  const trending = useQuery({ queryKey: ["trending"], queryFn: jikan.topAiring, staleTime: 5 * 60_000 });
  const season = useQuery({ queryKey: ["season"], queryFn: jikan.seasonNow, staleTime: 5 * 60_000 });
  const top = useQuery({ queryKey: ["top"], queryFn: jikan.topAll, staleTime: 5 * 60_000 });
  const upcoming = useQuery({ queryKey: ["upcoming"], queryFn: jikan.upcoming, staleTime: 5 * 60_000 });
  const newReleases = useQuery({ queryKey: ["new"], queryFn: jikan.newReleases, staleTime: 5 * 60_000 });
  const featured = useQuery({ queryKey: ["featured"], queryFn: jikan.topAll, staleTime: 5 * 60_000 });
  const search = useQuery({
    queryKey: ["search", q],
    queryFn: () => jikan.search(q),
    enabled: q.length > 0,
  });

  const heroFeatured = trending.data?.[0];
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    setFeaturedIndex(0);
  }, [featured.data]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {q ? (
        <main className="pt-24">
          <AnimeRow title={`Results for "${q}"`} eyebrow="Search" items={search.data} loading={search.isLoading} />
        </main>
      ) : (
        <main>
          <Hero featured={heroFeatured} />
          <ContinueWatchingRow />
          
          {/* Featured Top 10 Carousel */}
          {featured.data && featured.data.length > 0 && (() => {
            const featuredItems = featured.data.slice(0, 10);
            const activeAnime = featuredItems[featuredIndex] ?? featuredItems[0];

            return (
              <section className="container py-12">
                <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Curated selection</p>
                    <h2 className="font-display text-2xl md:text-3xl font-semibold">Featured top 10</h2>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Tap a thumbnail to switch the spotlight, then jump straight into the watch page.
                  </p>
                </div>

                <Link to={`/watch/${activeAnime.mal_id}`} className="block group">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="relative overflow-hidden rounded-2xl bg-card/60 ring-1 ring-border/60 hover:ring-primary/60 transition-all"
                  >
                    <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr] min-h-[420px]">
                      <div className="relative isolate min-h-[320px] lg:min-h-[420px] bg-secondary">
                        {activeAnime.images?.jpg?.large_image_url ? (
                          <img
                            src={activeAnime.images.jpg.large_image_url}
                            alt={activeAnime.title_english || activeAnime.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="grid h-full place-items-center bg-gradient-to-br from-secondary to-background text-muted-foreground">
                            No art
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 lg:max-w-2xl">
                          <div className="mb-3 flex items-center gap-3">
                            <span className="rounded-full bg-gradient-ember px-3 py-1 text-xs font-semibold text-primary-foreground shadow-glow">
                              #{featuredIndex + 1}
                            </span>
                            {activeAnime.score ? (
                              <span className="text-xs uppercase tracking-[0.25em] text-primary/90">
                                {activeAnime.score.toFixed(2)} rating
                              </span>
                            ) : null}
                          </div>
                          <h3 className="font-display text-3xl md:text-5xl font-semibold text-white leading-tight line-clamp-2">
                            {activeAnime.title_english || activeAnime.title}
                          </h3>
                          <p className="mt-3 max-w-2xl text-sm md:text-base text-white/82 line-clamp-3">
                            {activeAnime.synopsis || "Featured anime picked from the monthly top 10."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-6 p-6 md:p-8 bg-background/70 backdrop-blur-sm">
                        <div className="space-y-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Spotlight details</p>
                          <div className="space-y-3">
                            <p className="text-lg font-semibold text-foreground">{activeAnime.title_english || activeAnime.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-6">
                              {activeAnime.genres && activeAnime.genres.length > 0
                                ? activeAnime.genres.slice(0, 3).map((genre) => genre.name).join(" • ")
                                : "Trending monthly top title"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Thumbnail slider</p>
                          <Carousel opts={{ align: "start", loop: false }} className="w-full">
                            <CarouselContent className="-ml-2">
                              {featuredItems.map((anime, idx) => {
                                const isActive = idx === featuredIndex;

                                return (
                                  <CarouselItem key={anime.mal_id} className="pl-2 basis-1/3 sm:basis-1/4 lg:basis-1/5">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        setFeaturedIndex(idx);
                                      }}
                                      className={`group relative block w-full overflow-hidden rounded-xl ring-2 transition-all ${
                                        isActive ? "ring-primary shadow-glow" : "ring-border/40 hover:ring-border/80"
                                      }`}
                                    >
                                      <div className="aspect-[2/3] bg-secondary">
                                        {anime.images?.jpg?.image_url ? (
                                          <img
                                            src={anime.images.jpg.image_url}
                                            alt={anime.title_english || anime.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                          />
                                        ) : (
                                          <div className="grid h-full place-items-center bg-gradient-to-br from-secondary to-background text-xs text-muted-foreground">
                                            #{idx + 1}
                                          </div>
                                        )}
                                      </div>
                                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                                        <p className="line-clamp-2 text-[11px] font-semibold text-white">
                                          {anime.title_english || anime.title}
                                        </p>
                                      </div>
                                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                                        #{idx + 1}
                                      </span>
                                    </button>
                                  </CarouselItem>
                                );
                              })}
                            </CarouselContent>
                            <CarouselPrevious className="hidden sm:flex -left-4" />
                            <CarouselNext className="hidden sm:flex -right-4" />
                          </Carousel>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </section>
            );
          })()}

          <AnimeRow id="trending" eyebrow="On the rise" title="Trending now" items={trending.data} loading={trending.isLoading} />
          <AnimeRow id="new" eyebrow="Hot off the press" title="New releases" items={newReleases.data} loading={newReleases.isLoading} />
          <AnimeRow id="season" eyebrow="Currently airing" title="This season" items={season.data} loading={season.isLoading} />
          <div className="container py-6">
            <Schedule items={[...(trending.data || []), ...(season.data || []), ...(newReleases.data || []), ...(top.data || []), ...(upcoming.data || [])]} />
            <div className="my-6 max-w-3xl mx-auto">
              <AdSlot slot="home-mid" className="mt-6" />
            </div>
          </div>
          <AnimeRow eyebrow="Coming soon" title="Upcoming releases" items={upcoming.data} loading={upcoming.isLoading} />
        </main>
      )}
    </div>
  );
};

export default Index;
