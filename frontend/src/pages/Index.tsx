import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AnimeRow } from "@/components/AnimeRow";
import { AdSlot } from "@/components/AdSlot";
import { Schedule } from "@/components/Schedule";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { jikan } from "@/lib/jikan";

const Index = () => {
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  useEffect(() => {
    document.title = "HeyAnime — Editorial anime streaming";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Stream trending, top-rated and seasonal anime in a cinematic editorial experience.");
  }, []);

  const trending = useQuery({ queryKey: ["trending"], queryFn: jikan.topAiring, staleTime: 5 * 60_000 });
  const season = useQuery({ queryKey: ["season"], queryFn: jikan.seasonNow, staleTime: 5 * 60_000 });
  const top = useQuery({ queryKey: ["top"], queryFn: jikan.topAll, staleTime: 5 * 60_000 });
  const upcoming = useQuery({ queryKey: ["upcoming"], queryFn: jikan.upcoming, staleTime: 5 * 60_000 });
  const newReleases = useQuery({ queryKey: ["new"], queryFn: jikan.newReleases, staleTime: 5 * 60_000 });
  const search = useQuery({
    queryKey: ["search", q],
    queryFn: () => jikan.search(q),
    enabled: q.length > 0,
  });

  const featured = trending.data?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {q ? (
        <main className="pt-24">
          <AnimeRow title={`Results for "${q}"`} eyebrow="Search" items={search.data} loading={search.isLoading} />
        </main>
      ) : (
        <main>
          <Hero featured={featured} />
          <ContinueWatchingRow />
          <AnimeRow id="trending" eyebrow="On the rise" title="Trending now" items={trending.data} loading={trending.isLoading} />
          <AnimeRow id="new" eyebrow="Hot off the press" title="New releases" items={newReleases.data} loading={newReleases.isLoading} />
          <AnimeRow id="season" eyebrow="Currently airing" title="This season" items={season.data} loading={season.isLoading} />
          <div className="container py-6">
            <Schedule items={[...(trending.data || []), ...(season.data || []), ...(newReleases.data || []), ...(top.data || []), ...(upcoming.data || [])]} />
            <div className="my-6 max-w-3xl mx-auto">
              <AdSlot slot="home-mid" className="mt-6" />
            </div>
          </div>
          <AnimeRow id="top" eyebrow="All-time greats" title="Top 10 of all time" items={top.data} loading={top.isLoading} numbered />
          <AnimeRow eyebrow="Coming soon" title="Upcoming releases" items={upcoming.data} loading={upcoming.isLoading} />
        </main>
      )}
    </div>
  );
};

export default Index;
