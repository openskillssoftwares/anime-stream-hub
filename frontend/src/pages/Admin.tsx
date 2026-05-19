import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2, ShieldCheck, Users, Film, MessageSquare,
  Ban, CheckCircle2, Trash2, AlertTriangle, BarChart3,
  Star, RefreshCw, Bell, Send,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, type AdminUserRow, type AdminCommentRow, type BannedAnimeRow } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  comments: number; ratings: number; banned_users: number;
  banned_anime: number; flagged_events: number; active_users: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [comments, setComments] = useState<AdminCommentRow[]>([]);
  const [ratings, setRatings] = useState<{ id?: string; user_id?: string; mal_id?: number; score?: number; updated_at?: string | null }[]>([]);
  const [flags, setFlags] = useState<{ id?: string; user_id?: string; action?: string; reason?: string; created_at?: string | null }[]>([]);
  const [banned, setBanned] = useState<BannedAnimeRow[]>([]);
  const [notices, setNotices] = useState<{ id: string; title: string; body: string; level: string; created_at?: string }[]>([]);

  const [malToBan, setMalToBan] = useState("");
  const [malReason, setMalReason] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeLevel, setNoticeLevel] = useState<"info" | "warning" | "critical" | "success">("info");

  useEffect(() => { document.title = "Admin — Hey Anime"; }, []);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }

    (async () => {
      try {
        // Ensure Supabase session is fresh before making admin calls
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Session expired. Please sign in again.");
          navigate("/auth", { replace: true });
          return;
        }

        const me = await api.me();
        if (!me.is_admin) {
          toast.error("Admins only");
          navigate("/", { replace: true });
          return;
        }
        setIsAdmin(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Auth failed");
        navigate("/", { replace: true });
      } finally {
        setChecking(false);
      }
    })();
  }, [authLoading, user, navigate]);

  // ── Load all data ────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (showToast = false) => {
    setRefreshing(true);
    try {
      const [s, u, c, r, f, b, n] = await Promise.allSettled([
        api.adminStats(),
        api.adminListUsers(),
        api.adminListComments(),
        api.adminListRatings(),
        api.adminListFlags(),
        api.adminListBannedAnime(),
        api.adminNotices(),
      ]);

      if (s.status === "fulfilled") setStats(s.value);
      if (u.status === "fulfilled") setUsers(u.value);
      if (c.status === "fulfilled") setComments(c.value);
      if (r.status === "fulfilled") setRatings(r.value);
      if (f.status === "fulfilled") setFlags(f.value);
      if (b.status === "fulfilled") setBanned(b.value);
      if (n.status === "fulfilled") setNotices(n.value as any);

      const failed = [s, u, c, r, f, b, n].filter((x) => x.status === "rejected");
      if (failed.length > 0) {
        // Log rejections to help debug
        failed.forEach((x) => {
          if (x.status === "rejected") console.error("Admin load error:", x.reason);
        });
        toast.error(`Loaded with ${failed.length} error${failed.length > 1 ? "s" : ""}. Check console.`);
      } else if (showToast) {
        toast.success("Data refreshed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const banUser = async (id: string) => {
    try { await api.adminBanUser(id); toast.success("User banned"); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const unbanUser = async (id: string) => {
    try { await api.adminUnbanUser(id); toast.success("User unbanned"); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const banAnime = async () => {
    const n = parseInt(malToBan, 10);
    if (!n) { toast.error("Enter a valid MAL ID"); return; }
    try {
      await api.adminBanAnime(n, malReason);
      toast.success("Anime blocked");
      setMalToBan(""); setMalReason("");
      loadAll();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const unbanAnime = async (id: number) => {
    try { await api.adminUnbanAnime(id); toast.success("Unblocked"); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const approveComment = async (id: string) => {
    try { await api.adminApproveComment(id); toast.success("Approved"); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const softDelete = async (id: string) => {
    try { await api.adminDeleteComment(id); toast.success("Removed"); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const hardDelete = async (id: string) => {
    if (!confirm("Permanently delete? Cannot be undone.")) return;
    try { await api.adminHardDeleteComment(id); toast.success("Deleted"); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const deleteNotice = async (id: string) => {
    try { await api.adminDeleteNotice(id); toast.success("Notice deleted"); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const postNotice = async () => {
    const title = noticeTitle.trim();
    const body = noticeBody.trim();
    if (!title || !body) { toast.error("Title and body required"); return; }
    try {
      await api.adminCreateNotice({ title, body, level: noticeLevel, target: "all" });
      setNoticeTitle(""); setNoticeBody("");
      toast.success("Notice posted");
      loadAll();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  // ── Loading states ────────────────────────────────────────────────────────
  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-28 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin console
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-semibold">Manage Hey Anime</h1>
              <p className="mt-2 text-muted-foreground max-w-xl">
                Review activity, moderate community contributions and gate content.
              </p>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="mt-2 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Active users" value={stats?.active_users ?? 0} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Comments" value={stats?.comments ?? 0} icon={<MessageSquare className="w-4 h-4" />} />
          <StatCard label="Ratings" value={stats?.ratings ?? 0} icon={<BarChart3 className="w-4 h-4" />} />
          <StatCard label="Banned users" value={stats?.banned_users ?? 0} icon={<Ban className="w-4 h-4" />} accent />
          <StatCard label="Banned anime" value={stats?.banned_anime ?? 0} icon={<Film className="w-4 h-4" />} accent />
          <StatCard label="Flagged events" value={stats?.flagged_events ?? 0} icon={<AlertTriangle className="w-4 h-4" />} />
        </div>

        <Tabs defaultValue="comments" className="mt-10">
          <TabsList className="bg-secondary/60 flex-wrap h-auto gap-1">
            <TabsTrigger value="comments"><MessageSquare className="w-4 h-4 mr-1.5" />Comments ({comments.length})</TabsTrigger>
            <TabsTrigger value="ratings"><Star className="w-4 h-4 mr-1.5" />Ratings ({ratings.length})</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1.5" />Users ({users.length})</TabsTrigger>
            <TabsTrigger value="flags"><AlertTriangle className="w-4 h-4 mr-1.5" />Flags ({flags.length})</TabsTrigger>
            <TabsTrigger value="anime"><Film className="w-4 h-4 mr-1.5" />Anime gate</TabsTrigger>
            <TabsTrigger value="notices"><Bell className="w-4 h-4 mr-1.5" />Notices ({notices.length})</TabsTrigger>
          </TabsList>

          {/* Comments */}
          <TabsContent value="comments" className="mt-6 space-y-3">
            {comments.length === 0 && <Empty>No comments yet</Empty>}
            {comments.map((c) => (
              <div key={c.id} className={`p-4 rounded-xl ring-1 ${c.deleted ? "bg-destructive/5 ring-destructive/30" : "bg-card/60 ring-border/60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{c.user_name || "anon"}</span>
                      <span>·</span>
                      <span>MAL #{c.mal_id}</span>
                      <span>·</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                      {c.deleted && <Badge variant="destructive" className="text-[10px]">removed</Badge>}
                      {!c.approved && <Badge variant="secondary" className="text-[10px]">pending</Badge>}
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.body}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(!c.approved || c.deleted) && (
                      <Button size="sm" variant="outline" onClick={() => approveComment(c.id)} title="Approve / restore">
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    {!c.deleted && (
                      <Button size="sm" variant="outline" onClick={() => softDelete(c.id)} title="Soft remove">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => hardDelete(c.id)} title="Hard delete" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Ratings */}
          <TabsContent value="ratings" className="mt-6 space-y-2">
            {ratings.length === 0 && <Empty>No ratings yet</Empty>}
            {ratings.map((r, i) => (
              <div key={r.id || `${r.user_id}-${r.mal_id}-${i}`} className="p-3 rounded-xl bg-card/60 ring-1 ring-border/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">MAL #{r.mal_id}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{r.user_id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Score: {r.score}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {r.updated_at ? new Date(r.updated_at).toLocaleString() : "recent"}
                </Badge>
              </div>
            ))}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-6 space-y-2">
            {users.length === 0 && <Empty>No users tracked yet</Empty>}
            {users.map((u) => (
              <div key={u.user_id} className="p-3 rounded-xl bg-card/60 ring-1 ring-border/60 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.name || "(unnamed)"}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{u.user_id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                    <span>{u.comments ?? 0} comments</span>
                    <span>{u.ratings ?? 0} ratings</span>
                    {u.banned && <Badge variant="destructive" className="text-[10px]">banned</Badge>}
                  </p>
                </div>
                {u.banned ? (
                  <Button size="sm" variant="outline" onClick={() => unbanUser(u.user_id)}>Unban</Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={() => banUser(u.user_id)}>Ban</Button>
                )}
              </div>
            ))}
          </TabsContent>

          {/* Flags */}
          <TabsContent value="flags" className="mt-6 space-y-2">
            {flags.length === 0 && <Empty>No flagged events yet</Empty>}
            {flags.map((f, i) => (
              <div key={f.id || `flag-${i}`} className="p-3 rounded-xl bg-card/60 ring-1 ring-border/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.action || "Event"}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{f.user_id || "system"}</p>
                  {f.reason && <p className="text-xs text-muted-foreground mt-0.5">{f.reason}</p>}
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {f.created_at ? new Date(f.created_at).toLocaleString() : "recent"}
                </Badge>
              </div>
            ))}
          </TabsContent>

          {/* Anime gate */}
          <TabsContent value="anime" className="mt-6 space-y-6">
            <div className="p-5 rounded-xl bg-card/60 ring-1 ring-border/60">
              <h3 className="font-display text-lg font-semibold mb-1">Block an anime by MAL ID</h3>
              <p className="text-sm text-muted-foreground mb-4">Blocked anime won't be playable on the watch page.</p>
              <div className="flex gap-2 flex-wrap">
                <Input
                  value={malToBan}
                  onChange={(e) => setMalToBan(e.target.value)}
                  placeholder="MAL ID e.g. 52991"
                  className="w-40 bg-secondary/50 border-border/60"
                />
                <Input
                  value={malReason}
                  onChange={(e) => setMalReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="flex-1 min-w-[200px] bg-secondary/50 border-border/60"
                />
                <Button onClick={banAnime} className="bg-gradient-ember text-primary-foreground">
                  <Ban className="w-4 h-4 mr-2" /> Block
                </Button>
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold mb-3">Currently blocked ({banned.length})</h3>
              {banned.length === 0 ? <Empty>No anime blocked</Empty> : (
                <div className="space-y-2">
                  {banned.map((b) => (
                    <div key={b.mal_id} className="p-3 rounded-xl bg-card/60 ring-1 ring-border/60 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">MAL #{b.mal_id}</p>
                        {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(b.banned_at).toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => unbanAnime(b.mal_id)}>Unblock</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Notices */}
          <TabsContent value="notices" className="mt-6 space-y-6">
            {/* Compose */}
            <div className="p-5 rounded-xl bg-card/60 ring-1 ring-border/60">
              <h3 className="font-display text-lg font-semibold mb-1">Post a notice</h3>
              <p className="text-sm text-muted-foreground mb-4">Shown to all users via the notification bell.</p>
              <div className="space-y-3">
                <Input
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="Title"
                  className="bg-secondary/50 border-border/60"
                />
                <Input
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  placeholder="Message body"
                  className="bg-secondary/50 border-border/60"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={noticeLevel}
                    onChange={(e) => setNoticeLevel(e.target.value as any)}
                    className="rounded-lg bg-secondary/50 border border-border/60 px-3 py-2 text-sm text-foreground"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                  <Button onClick={postNotice} className="bg-gradient-ember text-primary-foreground">
                    <Send className="w-4 h-4 mr-2" /> Post notice
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing notices */}
            <div>
              <h3 className="font-display text-lg font-semibold mb-3">Active notices ({notices.length})</h3>
              {notices.length === 0 ? <Empty>No active notices</Empty> : (
                <div className="space-y-2">
                  {notices.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-card/60 ring-1 ring-border/60 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={n.level === "critical" ? "destructive" : "secondary"} className="text-[10px] uppercase">
                            {n.level}
                          </Badge>
                          <p className="text-sm font-medium truncate">{n.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        {n.created_at && (
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => deleteNotice(n.id)}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon, accent }: {
  label: string; value: number; icon?: React.ReactNode; accent?: boolean;
}) => (
  <div className={`p-4 rounded-xl ring-1 ${
    accent
      ? "bg-gradient-ember text-primary-foreground ring-transparent shadow-glow"
      : "bg-card/60 ring-border/60"
  }`}>
    <div className={`flex items-center gap-2 text-xs uppercase tracking-widest mb-1 ${
      accent ? "opacity-80" : "text-muted-foreground"
    }`}>
      {icon} {label}
    </div>
    <p className="font-display text-3xl font-semibold">{value.toLocaleString()}</p>
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground italic py-8 text-center bg-card/30 rounded-xl ring-1 ring-border/30">
    {children}
  </p>
);

export default Admin;
