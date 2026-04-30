import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  LogOut,
  User as UserIcon,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Home,
  Compass,
  Flame,
  CalendarDays,
  Trophy,
  Dices,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { jikan, type Anime, rankSearchResults } from "@/lib/jikan";
import { aiRecommendations, dedupeAnime } from "@/lib/recommendations";

const buildWatchContext = async () => {
  try {
    const progress = await api.myProgress(12);
    const watchedTitles = progress.map((p) => p.title).filter(Boolean) as string[];
    const ids = Array.from(new Set(progress.map((p) => p.mal_id))).slice(0, 6);
    const genreCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    for (const id of ids) {
      const anime = await jikan.byId(id);
      if (anime?.genres) {
        for (const genre of anime.genres) {
          genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
        }
      }
      if (anime?.type) {
        typeCounts[anime.type] = (typeCounts[anime.type] || 0) + 1;
      }
    }

    return {
      watchedTitles,
      watchedGenres: Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]).slice(0, 3),
      favoriteTypes: Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]).slice(0, 3),
    };
  } catch {
    return {};
  }
};

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pool, setPool] = useState<Anime[]>([]);
  const [aiPicks, setAiPicks] = useState<Anime[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [seenRandom, setSeenRandom] = useState<Set<number>>(new Set());
  const [suggestions, setSuggestions] = useState<Anime[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const trimmedQuery = q.trim();

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    api.me().then((m) => setIsAdmin(m.is_admin)).catch(() => setIsAdmin(false));
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [top, airing] = await Promise.all([jikan.topAll(), jikan.topAiring()]);
        const unique = dedupeAnime([...(top || []), ...(airing || [])]);
        if (!mounted) return;
        setPool(unique);
        const picks = await aiRecommendations(unique, 6);
        if (!mounted) return;
        setAiPicks(picks);
      } catch {
        if (!mounted) return;
        setPool([]);
        setAiPicks([]);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      if (!trimmedQuery) {
        if (active) {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
        return;
      }

      setSuggestionsLoading(true);
      try {
        const found = await jikan.search(trimmedQuery);
        if (!active) return;
        const ranked = rankSearchResults(dedupeAnime(found).slice(0, 10), trimmedQuery).slice(0, 7);
        setSuggestions(ranked);
        setSuggestionsOpen(true);
      } catch {
        if (active) {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }, 240);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [trimmedQuery]);

  const suggestionList = useMemo(() => suggestions.slice(0, 6), [suggestions]);

  const refreshAi = async () => {
    if (!pool.length) return;
    setAiLoading(true);
    try {
      const context = user ? await buildWatchContext() : {};
      const picks = await aiRecommendations(pool, 6, context);
      setAiPicks(picks);
    } catch {
      setAiPicks([]);
    } finally {
      setAiLoading(false);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedQuery) {
      setSuggestionsOpen(false);
      navigate(`/browse?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const goRandom = () => {
    if (!pool.length) return;
    if (seenRandom.size >= pool.length) {
      setSeenRandom(new Set());
    }
    const available = pool.filter((a) => !seenRandom.has(a.mal_id));
    const next = available[Math.floor(Math.random() * available.length)];
    if (!next) return;
    const nextSeen = new Set(seenRandom);
    nextSeen.add(next.mal_id);
    setSeenRandom(nextSeen);
    navigate(`/watch/${next.mal_id}`);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-border/50">
      <div className="container flex items-center gap-4 h-20">
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <Sparkles className="w-10 h-10 text-primary transition-transform group-hover:rotate-12" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Hey Anime<span className="text-primary">.</span>
          </span>
        </Link>

        <nav className="hidden xl:flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/browse" className="hover:text-foreground transition-colors inline-flex items-center gap-2" data-testid="nav-browse">
            <Compass className="w-5 h-5" /> Browse
          </Link>
          <a href="/#trending" className="hover:text-foreground transition-colors inline-flex items-center gap-2">
            <Flame className="w-5 h-5" /> Trending
          </a>
          <a href="/#new" className="hover:text-foreground transition-colors inline-flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> New
          </a>
          <a href="/#season" className="hover:text-foreground transition-colors inline-flex items-center gap-2">
            <CalendarDays className="w-5 h-5" /> This Season
          </a>
          <a href="/#top" className="hover:text-foreground transition-colors inline-flex items-center gap-2">
            <Trophy className="w-5 h-5" /> Top 10
          </a>
        </nav>

        <form onSubmit={onSearch} className="flex-1 max-w-md ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => trimmedQuery && setSuggestionsOpen(true)}
            placeholder="Search anime…"
            className="pl-9 bg-secondary/50 border-border/60 focus-visible:ring-primary"
          />
          {suggestionsOpen && trimmedQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-background/95 backdrop-blur-xl ring-1 ring-border/70 shadow-2xl overflow-hidden">
              <div className="px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground flex items-center justify-between">
                <span>Autosuggestions</span>
                {suggestionsLoading ? <span>Searching…</span> : <span>{suggestionList.length} results</span>}
              </div>
              <div className="max-h-96 overflow-auto">
                {suggestionList.length === 0 && !suggestionsLoading && (
                  <div className="px-3 py-4 text-sm text-muted-foreground">No close matches found.</div>
                )}
                {suggestionList.map((anime) => (
                  <button
                    key={anime.mal_id}
                    type="button"
                    onClick={() => {
                      setSuggestionsOpen(false);
                      navigate(`/watch/${anime.mal_id}`);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/60 transition-colors border-t border-border/40"
                  >
                    <img
                      src={anime.images?.jpg?.image_url}
                      alt={anime.title}
                      className="w-12 h-16 rounded-md object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{anime.title_english || anime.title}</span>
                        <span className="text-xs text-muted-foreground">{(anime.score || 0).toFixed(1)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(anime.genres || []).slice(0, 2).map((g) => (
                          <span key={g.name} className="text-[11px] text-muted-foreground bg-muted/10 px-2 py-0.5 rounded">
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full p-2" title="AI recommendations">
              <Bot className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-2 py-1.5 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">AI-based recommendations</div>
              <Button size="sm" variant="ghost" onClick={refreshAi} disabled={aiLoading}>
                {aiLoading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
            <DropdownMenuSeparator />
            {aiPicks.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">No recommendations available yet.</div>
            )}
            {aiPicks.map((a) => (
              <DropdownMenuItem key={a.mal_id} onClick={() => navigate(`/watch/${a.mal_id}`)} className="py-2">
                <img src={a.images?.jpg?.image_url} alt={a.title} className="w-12 h-16 rounded mr-3 object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{a.title_english || a.title}</span>
                    <span className="text-xs text-muted-foreground">{(a.score || 0).toFixed(1)}</span>
                  </div>
                  <div className="mt-1 flex gap-1">
                    {(a.genres || []).slice(0, 2).map((g) => (
                      <span key={g.name} className="text-[11px] text-muted-foreground bg-muted/10 px-2 py-0.5 rounded">
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={goRandom} className="inline-flex items-center gap-2 px-4 shrink-0" title="Random anime">
          <Dices className="w-5 h-5" /> Random
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <UserIcon className="w-5 h-5" />
                {isAdmin && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary shadow-glow" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard") }>
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => user && navigate(`/profile/${user.id}`)} data-testid="nav-my-profile">
                <UserIcon className="w-4 h-4 mr-2" /> My profile
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <ShieldCheck className="w-4 h-4 mr-2 text-primary" /> Admin console
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="default" size="sm" className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow">
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
};

export default Navbar;
