import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Star, Clock, ChevronLeft, ChevronRight, Loader2, CalendarDays, Tv } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BroadcastAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { image_url: string; large_image_url: string } };
  score: number | null;
  episodes: number | null;
  status: string;
  genres: { mal_id: number; name: string }[];
  broadcast: {
    day: string | null;
    time: string | null; // JST e.g. "23:00"
    timezone: string | null;
    string: string | null;
  };
  synopsis: string | null;
  type: string | null;
}

interface DaySchedule {
  day: string;        // "monday"
  label: string;      // "Mon, 19 May"
  date: Date;
  anime: BroadcastAnime[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_SHORT: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a JST time string "HH:MM" to GMT "HH:MM GMT"
 * JST = UTC+9, so GMT = JST - 9 hours
 */
const jstToGmt = (timeStr: string): string => {
  try {
    const [hh, mm] = timeStr.split(":").map(Number);
    const gmtHours = ((hh - 9) + 24) % 24; // subtract 9, wrap around midnight
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(gmtHours)}:${pad(mm)} GMT`;
  } catch {
    return timeStr;
  }
};

/**
 * Get the calendar Date for a given weekday name relative to today.
 * Returns the NEXT occurrence (including today).
 */
const getNextDateForDay = (dayName: string): Date => {
  const dayIndex = WEEK_DAYS.indexOf(dayName); // 0 = monday
  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7; // JS Sunday=0 → make Monday=0
  let diff = dayIndex - todayIndex;
  if (diff < 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d;
};

const formatDayLabel = (d: Date): string =>
  d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

const isToday = (d: Date): boolean => {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

const fetchSchedule = async (day: string): Promise<BroadcastAnime[]> => {
  const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${day}&limit=8`);
  if (!res.ok) throw new Error(`Failed to fetch schedule for ${day}`);
  const json = await res.json();
  return (json.data as BroadcastAnime[]) ?? [];
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Schedule: React.FC<{ className?: string }> = ({ className = "" }) => {
  // Show 3 days starting from today
  const visibleDays = useMemo((): DaySchedule[] => {
    const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
    return Array.from({ length: 3 }, (_, i) => {
      const dayIdx = (todayIndex + i) % 7;
      const day = WEEK_DAYS[dayIdx];
      const date = getNextDateForDay(day);
      return { day, label: formatDayLabel(date), date, anime: [] };
    });
  }, []);

  const [schedules, setSchedules] = useState<DaySchedule[]>(visibleDays);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeDay, setActiveDay] = useState(0); // index into visibleDays
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch all 3 days in parallel with staggered requests to avoid rate limits
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          visibleDays.map((d, i) =>
            new Promise<BroadcastAnime[]>((resolve) =>
              setTimeout(async () => {
                try { resolve(await fetchSchedule(d.day)); }
                catch { resolve([]); }
              }, i * 400) // stagger by 400ms to avoid Jikan rate limit
            )
          )
        );
        if (cancelled) return;
        setSchedules(visibleDays.map((d, i) => ({ ...d, anime: results[i] })));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  const current = schedules[activeDay];
  const prevDay = () => setActiveDay((v) => Math.max(0, v - 1));
  const nextDay = () => setActiveDay((v) => Math.min(schedules.length - 1, v + 1));

  return (
    <div className={`w-full max-w-6xl mx-auto rounded-3xl overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.15),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.92))] ring-1 ring-border/50 shadow-2xl ${className}`}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 pt-6 pb-4 border-b border-border/30">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Live broadcast schedule
          </p>
          <h3 className="text-2xl md:text-3xl font-semibold">Airing This Week</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Real airtime data from MyAnimeList · Times shown in GMT
          </p>
        </div>

        {/* Day tabs — desktop */}
        <div className="hidden sm:flex items-center gap-1 bg-background/40 rounded-2xl p-1 ring-1 ring-border/40">
          {schedules.map((d, i) => (
            <button
              key={d.day}
              onClick={() => setActiveDay(i)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeDay === i
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{DAY_SHORT[d.day]}</span>
              {isToday(d.date) && (
                <span className="ml-1 text-[10px] opacity-70">(Today)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Day nav — mobile */}
      <div className="sm:hidden flex items-center justify-between px-6 py-3 border-b border-border/30">
        <button onClick={prevDay} disabled={activeDay === 0} className="p-1.5 rounded-lg hover:bg-secondary/50 disabled:opacity-30 transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">
            {DAY_SHORT[current.day]}
            {isToday(current.date) && <span className="ml-2 text-xs text-primary">(Today)</span>}
          </p>
          <p className="text-xs text-muted-foreground">{current.label}</p>
        </div>
        <button onClick={nextDay} disabled={activeDay === schedules.length - 1} className="p-1.5 rounded-lg hover:bg-secondary/50 disabled:opacity-30 transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Fetching broadcast schedule…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <CalendarDays className="w-8 h-8 opacity-40" />
            <p className="text-sm">Couldn't load schedule. Try again later.</p>
          </div>
        ) : current.anime.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Tv className="w-8 h-8 opacity-40" />
            <p className="text-sm">No broadcasts found for {current.label}.</p>
          </div>
        ) : (
          <>
            {/* Desktop — 3-column grid of days */}
            <div className="hidden sm:grid grid-cols-3 gap-4">
              {schedules.map((d, di) => (
                <div key={d.day} className={`rounded-2xl transition-all duration-200 ${
                  activeDay === di
                    ? "bg-background/40 ring-1 ring-primary/40"
                    : "bg-background/20 ring-1 ring-border/30"
                }`}>
                  {/* Day header */}
                  <button
                    onClick={() => setActiveDay(di)}
                    className="w-full flex items-center justify-between px-4 py-3 border-b border-border/20"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">
                        {d.label}
                        {isToday(d.date) && <span className="ml-2 text-xs text-primary">(Today)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{d.anime.length} shows airing</p>
                    </div>
                    {activeDay === di && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>

                  {/* Anime list */}
                  <div className="divide-y divide-border/20">
                    {d.anime.slice(0, 6).map((anime) => (
                      <AnimeRow
                        key={anime.mal_id}
                        anime={anime}
                        expanded={expandedId === anime.mal_id}
                        onExpand={() => setExpandedId(expandedId === anime.mal_id ? null : anime.mal_id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile — single day view */}
            <div className="sm:hidden rounded-2xl bg-background/30 ring-1 ring-border/30 divide-y divide-border/20 overflow-hidden">
              {current.anime.map((anime) => (
                <AnimeRow
                  key={anime.mal_id}
                  anime={anime}
                  expanded={expandedId === anime.mal_id}
                  onExpand={() => setExpandedId(expandedId === anime.mal_id ? null : anime.mal_id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── AnimeRow sub-component ───────────────────────────────────────────────────

const AnimeRow: React.FC<{
  anime: BroadcastAnime;
  expanded: boolean;
  onExpand: () => void;
}> = ({ anime, expanded, onExpand }) => {
  const localTime = anime.broadcast?.time ? jstToGmt(anime.broadcast.time) : null;
  const thumb = anime.images?.jpg?.image_url;
  const title = anime.title_english || anime.title;

  return (
    <div className="group">
      <button
        onClick={onExpand}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
      >
        {/* Thumbnail */}
        <div className="w-10 h-14 rounded-lg overflow-hidden bg-background/60 shrink-0 ring-1 ring-border/30">
          {thumb ? (
            <img src={thumb} alt={title} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center">
              <Tv className="w-4 h-4 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-1 leading-snug">{title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {localTime && (
              <span className="flex items-center gap-0.5 text-[10px] text-primary font-semibold">
                <Clock className="w-2.5 h-2.5" /> {localTime}
              </span>
            )}
            {anime.score && (
              <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
                <Star className="w-2.5 h-2.5 fill-yellow-400" /> {anime.score.toFixed(1)}
              </span>
            )}
            {anime.episodes && (
              <span className="text-[10px] text-muted-foreground">{anime.episodes} eps</span>
            )}
          </div>
          {anime.genres?.length > 0 && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-1">
              {anime.genres.slice(0, 2).map((g) => g.name).join(" · ")}
            </p>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 bg-white/[0.03]">
          {anime.synopsis && (
            <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed mb-2">
              {anime.synopsis}
            </p>
          )}
          <Link
            to={`/watch/${anime.mal_id}?ep=1`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Watch now →
          </Link>
        </div>
      )}
    </div>
  );
};

export default Schedule;
