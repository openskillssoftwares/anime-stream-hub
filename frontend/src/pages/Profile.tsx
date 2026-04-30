import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  User as UserIcon, Star, MessageSquare, PlayCircle, Share2,
  Calendar, Loader2, ShieldCheck, Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Tab = "watching" | "ratings" | "comments";

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return ""; }
};

const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const isMe = !!user && user.id === userId;
  const [tab, setTab] = useState<Tab>("watching");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => api.publicProfile(userId!),
    enabled: !!userId,
    retry: 0,
  });

  const watchlist = useQuery({
    queryKey: ["profile-watchlist", userId],
    queryFn: () => api.publicUserWatchlist(userId!),
    enabled: !!userId && tab === "watching",
  });

  const ratings = useQuery({
    queryKey: ["profile-ratings", userId],
    queryFn: () => api.publicUserRatings(userId!),
    enabled: !!userId && tab === "ratings",
  });

  const comments = useQuery({
    queryKey: ["profile-comments", userId],
    queryFn: () => api.publicUserComments(userId!),
    enabled: !!userId && tab === "comments",
  });

  useEffect(() => {
    if (profile.data) {
      document.title = `${profile.data.user_name} — Lumen`;
    }
  }, [profile.data]);

  const initial = useMemo(() => {
    const n = profile.data?.user_name || "?";
    return n.charAt(0).toUpperCase();
  }, [profile.data]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: `${profile.data?.user_name} on Lumen` });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  if (profile.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-32 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container pt-32 text-center">
          <p className="font-display text-3xl">Profile not found</p>
          <p className="text-muted-foreground mt-2">
            This user doesn't exist or hasn't been active yet.
          </p>
          <Button asChild variant="ghost" className="mt-6">
            <Link to="/">← Back to home</Link>
          </Button>
        </main>
      </div>
    );
  }

  const p = profile.data;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="relative pt-28 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <main className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center gap-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-ember grid place-items-center text-4xl font-display font-semibold text-primary-foreground shadow-glow ring-1 ring-primary/40">
                {initial}
              </div>
              {p.is_admin && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> admin
                </span>
              )}
            </div>

            <div className="flex-1 min-w-[260px]">
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {isMe ? "Your profile" : "Public profile"}
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-semibold" data-testid="profile-name">
                {p.user_name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {p.joined_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Joined {formatDate(p.joined_at)}
                  </span>
                )}
                <Badge variant="secondary" className="gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5" /> {p.counts.progress} watched
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <Star className="w-3.5 h-3.5" /> {p.counts.ratings} rated
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> {p.counts.comments} comments
                </Badge>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleShare}
              data-testid="profile-share-btn"
              className="ml-auto"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </motion.div>

          {/* Tabs */}
          <div className="mt-10 inline-flex items-center gap-1 p-1 bg-secondary/40 ring-1 ring-border/60 rounded-full text-sm">
            {([
              { v: "watching", label: "Watchlist", icon: PlayCircle },
              { v: "ratings", label: "Ratings", icon: Star },
              { v: "comments", label: "Comments", icon: MessageSquare },
            ] as { v: Tab; label: string; icon: typeof Star }[]).map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                data-testid={`profile-tab-${v}`}
                className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  tab === v
                    ? "bg-gradient-ember text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </main>
      </div>

      {/* Body */}
      <main className="container pb-24">
        {tab === "watching" && (
          <Section
            isLoading={watchlist.isLoading}
            empty={!watchlist.data?.length}
            emptyText={isMe ? "Start watching anything to fill this." : `${p.user_name} hasn't watched anything yet.`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {watchlist.data?.map((w) => (
                <Link
                  key={w.mal_id}
                  to={`/watch/${w.mal_id}?ep=${w.episode}`}
                  className="group relative overflow-hidden rounded-lg ring-1 ring-border/50 hover:ring-primary/60 transition-all"
                  data-testid={`watchlist-card-${w.mal_id}`}
                >
                  <div className="aspect-[2/3] bg-secondary/40">
                    {w.image_url ? (
                      <img
                        src={w.image_url}
                        alt={w.title || ""}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-2 bg-secondary/90">
                      <div
                        className="h-full bg-gradient-ember"
                        style={{ width: `${Math.min(100, w.percent)}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="font-medium text-sm truncate">{w.title || `MAL #${w.mal_id}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.completed ? "Completed" : `Ep ${w.episode} · ${Math.round(w.percent)}%`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {tab === "ratings" && (
          <Section
            isLoading={ratings.isLoading}
            empty={!ratings.data?.length}
            emptyText={isMe ? "Rate any anime to see it here." : `${p.user_name} hasn't rated anything yet.`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {ratings.data?.map((r) => (
                <Link
                  key={r.mal_id}
                  to={`/watch/${r.mal_id}`}
                  className="group relative overflow-hidden rounded-lg ring-1 ring-border/50 hover:ring-primary/60 transition-all"
                  data-testid={`rating-card-${r.mal_id}`}
                >
                  <div className="aspect-[2/3] bg-secondary/40 relative">
                    {r.image_url ? (
                      <img
                        src={r.image_url}
                        alt={r.title || ""}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <Star className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-background/85 backdrop-blur-sm text-xs font-semibold rounded-full px-2 py-1 flex items-center gap-1 ring-1 ring-primary/40">
                      <Star className="w-3 h-3 fill-primary text-primary" /> {r.score}/5
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="font-medium text-sm truncate">{r.title || `MAL #${r.mal_id}`}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.updated_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {tab === "comments" && (
          <Section
            isLoading={comments.isLoading}
            empty={!comments.data?.length}
            emptyText={isMe ? "Drop a comment on any anime to start a conversation." : `${p.user_name} hasn't posted yet.`}
          >
            <div className="space-y-3 max-w-2xl">
              {comments.data?.map((c) => (
                <Link
                  key={c.id}
                  to={`/watch/${c.mal_id}`}
                  className="block p-4 rounded-lg bg-secondary/30 ring-1 ring-border/50 hover:ring-primary/60 transition-all"
                  data-testid={`comment-card-${c.id}`}
                >
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> on MAL #{c.mal_id}
                    <span>· {formatDate(c.created_at)}</span>
                  </p>
                  <p className="text-sm leading-relaxed">{c.body}</p>
                </Link>
              ))}
            </div>
          </Section>
        )}
      </main>
    </div>
  );
};

const Section = ({
  isLoading, empty, emptyText, children,
}: {
  isLoading: boolean; empty: boolean; emptyText: string; children: React.ReactNode;
}) => {
  if (isLoading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (empty) {
    return (
      <div className="py-20 text-center text-muted-foreground italic">{emptyText}</div>
    );
  }
  return <div className="mt-2">{children}</div>;
};

export default Profile;
