import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Shuffle, Sparkles } from "lucide-react";
import type { Anime } from "@/lib/jikan";
import { dedupeAnime } from "@/lib/recommendations";

const slots = ["09:00", "12:00", "15:00", "20:00"];
const DAYS = 3;

const dayLabel = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const Schedule: React.FC<{ className?: string; items?: Anime[] }> = ({ className = "", items = [] }) => {
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const byDay = useMemo(() => {
    const animePool = dedupeAnime(items.length ? items : []);
    type ScheduleSlot = {
      time: string;
      title: string;
      mal_id?: number;
      image?: string;
      genres: { name: string }[];
    };
    const out: Array<Array<ScheduleSlot>> = Array.from({ length: DAYS }, () => []);
    let cursor = animePool.length ? shuffleSeed % animePool.length : 0;
    for (let i = 0; i < DAYS; i += 1) {
      out[i] = slots.map((time, idx) => {
        const pick = animePool.length ? animePool[cursor % animePool.length] : null;
        cursor += 1 + ((shuffleSeed + i + idx) % 2);
        return {
          time,
          mal_id: pick?.mal_id,
          image: pick?.images?.jpg?.image_url,
          genres: pick?.genres || [],
          title: pick ? (pick.title_english || pick.title) : `Editorial spotlight ${i + 1}-${idx + 1}`,
        };
      });
    }
    return out;
  }, [items, shuffleSeed]);

  return (
    <div className={`w-full max-w-6xl mx-auto p-6 rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.88))] ring-1 ring-border/50 shadow-2xl ${className}`}>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-5 gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5" /> Live lineup</p>
          <h3 className="text-2xl md:text-3xl font-semibold">3-Day Schedule</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <p>Hey Anime Streaming Schedule</p>
          <button onClick={() => setShuffleSeed((s) => s + 1)} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-secondary/50 ring-1 ring-border/60 hover:ring-primary/60 transition-all">
            <Shuffle className="w-3.5 h-3.5" /> Shuffle slots
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {byDay.map((rows, day) => (
          <div key={`day-${day}`} className="group rounded-2xl bg-background/55 ring-1 ring-border/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:ring-primary/50 hover:shadow-glow">
            <p className="text-sm font-semibold mb-3 text-primary/90">{dayLabel(day)}</p>
            <div className="space-y-2.5">
              {rows.map((s) => (
                <Link
                  key={`${day}-${s.time}`}
                  to={s.mal_id ? `/watch/${s.mal_id}` : "/browse"}
                  className="flex items-center gap-3 rounded-xl bg-secondary/25 hover:bg-secondary/40 transition-all p-2 ring-1 ring-transparent hover:ring-primary/40"
                >
                  <div className="w-14 h-12 rounded-lg overflow-hidden bg-background/80 flex-shrink-0">
                    {s.image ? (
                      <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[10px] text-muted-foreground">Soon</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-0.5">
                      <span>{s.time}</span>
                      {s.genres?.[0] && <span className="truncate max-w-[7rem]">{s.genres[0].name}</span>}
                    </div>
                    <span className="font-medium text-sm text-right line-clamp-1 block">{s.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Schedule;
