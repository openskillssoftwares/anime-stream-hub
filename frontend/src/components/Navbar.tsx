import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Search, LogOut, User as UserIcon, Sparkles, LayoutDashboard,
  ShieldCheck, Compass, Video, Flame, CalendarDays, Trophy,
  Dices, Bot, Menu, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { jikan, type Anime, rankSearchResults } from "@/lib/jikan";
import { aiRecommendations, dedupeAnime } from "@/lib/recommendations";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WatchContext {
  watchedTitles?: string[];
  watchedGenres?: string[];
  favoriteTypes?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildWatchContext = async (): Promise<WatchContext> => {
  try {
    const progress = await api.myProgress(12);
    const watchedTitles = progress.map((p) => p.title).filter(Boolean) as string[];
    const ids = Array.from(new Set(progress.map((p) => p.mal_id))).slice(0, 6);
    const genreCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    await Promise.allSettled(
      ids.map(async (id) => {
        const anime = await jikan.byId(id);
        for (const genre of anime?.genres ?? []) {
          genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
        }
        if (anime?.type) typeCounts[anime.type] = (typeCounts[anime.type] || 0) + 1;
      })
    );

    return {
      watchedTitles,
      watchedGenres: Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]).slice(0, 3),
      favoriteTypes: Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]).slice(0, 3),
    };
  } catch {
    return {};
  }
};

const NAV_LINKS = [
  { to: "/browse",    label: "Browse",      icon: Compass,     type: "link" as const },
  { to: "/community", label: "Community",   icon: Dices,       type: "link" as const },
  { to: "/rooms",     label: "Rooms",       icon: Video,       type: "link" as const },
  { to: "/#trending", label: "Trending",    icon: Flame,       type: "hash" as const },
  { to: "/#new",      label: "New",         icon: Sparkles,    type: "hash" as const },
  { to: "/#season",   label: "This Season", icon: CalendarDays,type: "hash" as const },
  { to: "/#top",      label: "Top 10",      icon: Trophy,      type: "hash" as const },
];

// ─── Component ───────────────────────────────────────────────────────────────

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchCache = useRef<Map<string, Anime[]>>(new Map());
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedQuery = q.trim();

  // ── Admin check ──
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    api.me().then((m) => setIsAdmin(m.is_admin)).catch(() => setIsAdmin(false));
  }, [user]);

  // ── Pool + AI picks (lazy — only fetch top-airing, skip top-all for speed) ──
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Fetch in parallel but only top-airing for initial pool (faster)
        const [top, airing] = await Promise.all([jikan.topAll(), jikan.topAiring()]);
        const unique = dedupeAnime([...(top ?? []), ...(airing ?? [])]);
        if (!mounted) return;
        setPool(unique);
        // AI picks are non-blocking — don't await in the critical path
        aiRecommendations(unique, 6).then((picks) => {
          if (mounted) setAiPicks(picks);
        });
      } catch {
        if (mounted) { setPool([]); setAiPicks([]); }
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ── Debounced search suggestions ──
  useEffect(() => {
    let active = true;

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      return;
    }

    const cached = searchCache.current.get(trimmedQuery);
    if (cached) {
      setSuggestions(cached);
      setSuggestionsOpen(true);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const found = await jikan.search(trimmedQuery);
        if (!active) return;
        const ranked = rankSearchResults(dedupeAnime(found).slice(0, 10), trimmedQuery).slice(0, 7);
        setSuggestions(ranked);
        setSuggestionsOpen(true);
        searchCache.current.set(trimmedQuery, ranked);
      } catch {
        if (active) { setSuggestions([]); setSuggestionsOpen(false); }
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }, 240);

    return () => { active = false; window.clearTimeout(timeout); };
  }, [trimmedQuery]);

  // ── Close suggestions on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Lock body scroll when mobile menu is open ──
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // ── Close mobile menu on route change ──
  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }, [navigate]);

  const suggestionList = useMemo(() => suggestions.slice(0, 6), [suggestions]);

  const refreshAi = useCallback(async () => {
    if (!pool.length) return;
    setAiLoading(true);
    try {
      const context = user ? await buildWatchContext() : {};
      const picks = await aiRecommendations(pool, 6, context);
      const pickIds = picks.map((p) => p.mal_id).join(",");
      const existingIds = aiPicks.map((p) => p.mal_id).join(",");
      if (existingIds && existingIds === pickIds) {
        setAiPicks([...pool].sort(() => Math.random() - 0.5).slice(0, 6));
      } else {
        setAiPicks(picks);
      }
    } catch {
      setAiPicks([]);
    } finally {
      setAiLoading(false);
    }
  }, [pool, aiPicks, user]);

  const onSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedQuery) return;
    setSuggestionsOpen(false);
    setMobileOpen(false);
    setMobileSearchOpen(false);
    navigate(`/browse?q=${encodeURIComponent(trimmedQuery)}`);
  }, [trimmedQuery, navigate]);

  const goRandom = useCallback(() => {
    if (!pool.length) return;
    const seen = seenRandom.size >= pool.length ? new Set<number>() : seenRandom;
    const available = pool.filter((a) => !seen.has(a.mal_id));
    const next = available[Math.floor(Math.random() * available.length)];
    if (!next) return;
    setSeenRandom(new Set([...seen, next.mal_id]));
    navigate(`/watch/${next.mal_id}`);
  }, [pool, seenRandom, navigate]);

  const closeSuggestions = useCallback(() => setSuggestionsOpen(false), []);

  // ─── Search dropdown (shared between desktop + mobile) ───────────────────
  const SearchDropdown = () => (
    suggestionsOpen && trimmedQuery ? (
      <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-background/95 backdrop-blur-xl ring-1 ring-border/70 shadow-2xl overflow-hidden">
        <div className="px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground flex items-center justify-between border-b border-border/40">
          <span>Results</span>
          {suggestionsLoading
            ? <span>Searching…</span>
            : <span>{suggestionList.length} found</span>
          }
        </div>
        <div className="max-h-80 overflow-auto">
          {suggestionList.length === 0 && !suggestionsLoading && (
            <div className="px-3 py-4 text-sm text-muted-foreground">No matches found.</div>
          )}
          {suggestionList.map((anime) => (
            <button
              key={anime.mal_id}
              type="button"
              onClick={() => {
                closeSuggestions();
                setMobileOpen(false);
                navigate(`/watch/${anime.mal_id}`);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/60 transition-colors border-t border-border/40 first:border-t-0"
            >
              <img
                src={anime.images?.jpg?.image_url}
                alt={anime.title}
                loading="lazy"
                className="w-10 h-14 rounded object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{anime.title_english || anime.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{(anime.score || 0).toFixed(1)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(anime.genres || []).slice(0, 2).map((g) => (
                    <span key={g.name} className="text-[10px] text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    ) : null
  );

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 glass border-b border-border/50">
        <div className="container flex items-center gap-3 h-16 md:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0" onClick={() => setMobileOpen(false)}>
            <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-primary transition-transform group-hover:rotate-12" />
            <span className="font-display text-lg md:text-xl font-semibold tracking-tight">
              Hey Anime<span className="text-primary">.</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden xl:flex items-center gap-4 text-sm text-muted-foreground ml-2">
            {NAV_LINKS.map(({ to, label, icon: Icon, type }) =>
              type === "link" ? (
                <Link key={to} to={to} className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              ) : (
                <a key={to} href={to} className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                  <Icon className="w-4 h-4" /> {label}
                </a>
              )
            )}
          </nav>

          {/* Desktop search */}
          <div ref={searchRef} className="hidden md:block flex-1 max-w-sm ml-auto relative">
            <form onSubmit={onSearch}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setSuggestionsOpen(true); }}
                onFocus={() => trimmedQuery && setSuggestionsOpen(true)}
                placeholder="Search anime…"
                className="pl-9 bg-secondary/50 border-border/60 focus-visible:ring-primary h-9"
              />
            </form>
            <SearchDropdown />
          </div>

          {/* AI recommendations */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hidden md:inline-flex" title="AI recommendations">
                <Bot className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-2 py-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">AI-based picks</span>
                <Button size="sm" variant="ghost" onClick={refreshAi} disabled={aiLoading} className="h-7 text-xs">
                  {aiLoading ? "Loading…" : "Refresh"}
                </Button>
              </div>
              <DropdownMenuSeparator />
              {aiPicks.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">No recommendations yet.</div>
              )}
              {aiPicks.map((a) => (
                <DropdownMenuItem key={a.mal_id} onClick={() => navigate(`/watch/${a.mal_id}`)} className="py-2">
                  <img src={a.images?.jpg?.image_url} alt={a.title} className="w-10 h-14 rounded mr-3 object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm">{a.title_english || a.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(a.score || 0).toFixed(1)}</span>
                    </div>
                    <div className="mt-1 flex gap-1">
                      {(a.genres || []).slice(0, 2).map((g) => (
                        <span key={g.name} className="text-[10px] text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Random — desktop only */}
          <Button
            variant="outline" size="sm"
            onClick={goRandom}
            className="hidden md:inline-flex items-center gap-2 px-3 shrink-0"
            title="Random anime"
          >
            <Dices className="w-4 h-4" /> Random
          </Button>

          {/* User menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative shrink-0">
                  <UserIcon className="w-5 h-5" />
                  {isAdmin && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary shadow-glow" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)} data-testid="nav-my-profile">
                  <UserIcon className="w-4 h-4 mr-2" /> My profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <ShieldCheck className="w-4 h-4 mr-2 text-primary" /> Admin console
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow shrink-0 hidden md:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          {/* Mobile: search icon + hamburger */}
          <div className="flex items-center gap-1 md:hidden ml-auto">
            <Button
              variant="ghost" size="icon"
              onClick={() => { setMobileSearchOpen((v) => !v); setMobileOpen(false); }}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => { setMobileOpen((v) => !v); setMobileSearchOpen(false); }}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile search bar (slides down) */}
        {mobileSearchOpen && (
          <div className="md:hidden border-t border-border/40 px-4 py-3 relative">
            <form onSubmit={onSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => { setQ(e.target.value); setSuggestionsOpen(true); }}
                placeholder="Search anime…"
                className="pl-9 bg-secondary/50 border-border/60"
              />
            </form>
            <SearchDropdown />
          </div>
        )}
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />

          {/* Drawer */}
          <div className="absolute top-16 left-0 right-0 bg-background border-b border-border/50 shadow-2xl overflow-y-auto max-h-[calc(100vh-4rem)]">
            <div className="container py-4 space-y-1">

              {/* Nav links */}
              {NAV_LINKS.map(({ to, label, icon: Icon, type }) => {
                const cls = "flex items-center justify-between px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors text-sm";
                const inner = (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-primary" /> {label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </>
                );
                return type === "link" ? (
                  <Link key={to} to={to} className={cls} onClick={() => setMobileOpen(false)}>{inner}</Link>
                ) : (
                  <a key={to} href={to} className={cls} onClick={() => setMobileOpen(false)}>{inner}</a>
                );
              })}

              <div className="border-t border-border/40 my-2" />

              {/* Random */}
              <button
                onClick={() => { goRandom(); setMobileOpen(false); }}
                className="flex items-center justify-between w-full px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors text-sm"
              >
                <span className="flex items-center gap-3">
                  <Dices className="w-4 h-4 text-primary" /> Random Anime
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="border-t border-border/40 my-2" />

              {/* Auth */}
              {user ? (
                <>
                  <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
                  <Link to="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors text-sm" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="w-4 h-4 text-primary" /> Dashboard
                  </Link>
                  <Link to={`/profile/${user.id}`} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors text-sm" onClick={() => setMobileOpen(false)}>
                    <UserIcon className="w-4 h-4 text-primary" /> My Profile
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors text-sm" onClick={() => setMobileOpen(false)}>
                      <ShieldCheck className="w-4 h-4 text-primary" /> Admin Console
                    </Link>
                  )}
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors text-sm text-left"
                  >
                    <LogOut className="w-4 h-4 text-primary" /> Sign out
                  </button>
                </>
              ) : (
                <div className="px-3 pb-2">
                  <Button asChild className="w-full bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow">
                    <Link to="/auth" onClick={() => setMobileOpen(false)}>Sign in</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
