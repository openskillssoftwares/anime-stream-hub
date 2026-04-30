import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2, ShieldCheck, Users, Film, MessageSquare,
  Ban, CheckCircle2, Trash2, AlertTriangle, BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, type AdminUserRow, type AdminCommentRow, type BannedAnimeRow } from "@/lib/api";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [stats, setStats] = useState<{ comments: number; ratings: number; banned_users: number; banned_anime: number; flagged_events: number; active_users: number } | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [comments, setComments] = useState<AdminCommentRow[]>([]);
  const [banned, setBanned] = useState<BannedAnimeRow[]>([]);

  const [malToBan, setMalToBan] = useState("");
  const [malReason, setMalReason] = useState("");

  useEffect(() => { document.title = "Admin — Lumen"; }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    (async () => {
      try {
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

  const loadAll = async () => {
    try {
      const [s, u, c, b] = await Promise.all([
        api.adminStats(), api.adminListUsers(), api.adminListComments(), api.adminListBannedAnime(),
      ]);
      setStats(s); setUsers(u); setComments(c); setBanned(b);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

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
    try { await api.adminBanAnime(n, malReason); toast.success("Anime banned"); setMalToBan(""); setMalReason(""); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const unbanAnime = async (id: number) => {
    try { await api.adminUnbanAnime(id); toast.success("Unbanned"); loadAll(); }
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
    if (!confirm("Permanently delete this comment? This cannot be undone.")) return;
    try { await api.adminHardDeleteComment(id); toast.success("Deleted"); loadAll(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Admin console</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold">Manage Lumen</h1>
          <p className="mt-3 text-muted-foreground max-w-xl">Review activity, moderate community contributions and gate content.</p>
        </motion.div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Active users" value={stats?.active_users ?? 0} icon={<Users className="w-4 h-4" />} />
          <Stat label="Comments" value={stats?.comments ?? 0} icon={<MessageSquare className="w-4 h-4" />} />
          <Stat label="Ratings" value={stats?.ratings ?? 0} icon={<BarChart3 className="w-4 h-4" />} />
          <Stat label="Banned users" value={stats?.banned_users ?? 0} icon={<Ban className="w-4 h-4" />} accent />
          <Stat label="Banned anime" value={stats?.banned_anime ?? 0} icon={<Film className="w-4 h-4" />} accent />
          <Stat label="Flagged events" value={stats?.flagged_events ?? 0} icon={<AlertTriangle className="w-4 h-4" />} />
        </div>

        <Tabs defaultValue="comments" className="mt-10">
          <TabsList className="bg-secondary/60">
            <TabsTrigger value="comments"><MessageSquare className="w-4 h-4 mr-2" />Comments</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="anime"><Film className="w-4 h-4 mr-2" />Anime gate</TabsTrigger>
          </TabsList>

          {/* Comments */}
          <TabsContent value="comments" className="mt-6">
            <div className="space-y-3">
              {comments.length === 0 && <Empty>No comments yet</Empty>}
              {comments.map((c) => (
                <div key={c.id} className={`p-4 rounded-lg ring-1 ${c.deleted ? "bg-destructive/5 ring-destructive/30" : "bg-card/60 ring-border/60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                        <span className="font-medium text-foreground">{c.user_name || "anon"}</span>
                        <span>·</span>
                        <span>MAL #{c.mal_id}</span>
                        <span>·</span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                        {c.deleted && <Badge variant="destructive">removed</Badge>}
                        {!c.approved && <Badge variant="secondary">pending</Badge>}
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
                      <Button size="sm" variant="ghost" onClick={() => hardDelete(c.id)} title="Hard delete" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-6">
            <div className="space-y-2">
              {users.length === 0 && <Empty>No users tracked yet</Empty>}
              {users.map((u) => (
                <div key={u.user_id} className="p-3 rounded-lg bg-card/60 ring-1 ring-border/60 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name || "(unnamed)"}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{u.user_id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {u.comments ?? 0} comments · {u.ratings ?? 0} ratings {u.banned && <Badge variant="destructive" className="ml-2">banned</Badge>}
                    </p>
                  </div>
                  {u.banned ? (
                    <Button size="sm" variant="outline" onClick={() => unbanUser(u.user_id)}>Unban</Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => banUser(u.user_id)}>Ban</Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Anime */}
          <TabsContent value="anime" className="mt-6 space-y-6">
            <div className="p-4 rounded-lg bg-card/60 ring-1 ring-border/60">
              <h3 className="font-display text-lg font-semibold mb-2">Block an anime by MAL ID</h3>
              <p className="text-sm text-muted-foreground mb-4">Blocked anime won't be playable on the watch page.</p>
              <div className="flex gap-2 flex-wrap">
                <Input value={malToBan} onChange={(e) => setMalToBan(e.target.value)} placeholder="MAL ID, e.g. 52991" className="w-40 bg-secondary/50 border-border/60" />
                <Input value={malReason} onChange={(e) => setMalReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 min-w-[200px] bg-secondary/50 border-border/60" />
                <Button onClick={banAnime} className="bg-gradient-ember text-primary-foreground">
                  <Ban className="w-4 h-4 mr-2" /> Block
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold mb-2">Currently blocked</h3>
              {banned.length === 0 ? <Empty>No anime blocked</Empty> : (
                <div className="space-y-2">
                  {banned.map((b) => (
                    <div key={b.mal_id} className="p-3 rounded-lg bg-card/60 ring-1 ring-border/60 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">MAL #{b.mal_id}</p>
                        {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => unbanAnime(b.mal_id)}>Unblock</Button>
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

const Stat = ({ label, value, icon, accent }: { label: string; value: number; icon?: React.ReactNode; accent?: boolean }) => (
  <div className={`p-4 rounded-lg ring-1 ${accent ? "bg-gradient-ember text-primary-foreground ring-transparent shadow-glow" : "bg-card/60 ring-border/60"}`}>
    <div className={`flex items-center gap-2 text-xs uppercase tracking-widest ${accent ? "opacity-80" : "text-muted-foreground"}`}>
      {icon} {label}
    </div>
    <p className="font-display text-3xl font-semibold mt-1">{value}</p>
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground italic py-6 text-center bg-card/30 rounded-lg ring-1 ring-border/30">{children}</p>
);

export default Admin;
