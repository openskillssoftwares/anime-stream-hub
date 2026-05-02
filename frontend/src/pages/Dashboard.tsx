import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import {
  User as UserIcon, Mail, Lock, Download, Upload, Loader2,
  ListChecks, LogOut, Sparkles, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/NotificationCenter";
import { fetchMalList, toDbStatus, buildMalXml, downloadFile } from "@/lib/mal";
import { api, type ProgressRow } from "@/lib/api";

interface Profile {
  display_name: string | null;
  mal_username: string | null;
}
interface WatchlistRow {
  id: string;
  mal_id: number;
  title: string;
  image_url: string | null;
  status: string;
  score: number | null;
  episodes_watched: number;
  total_episodes: number | null;
}

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({ display_name: "", mal_username: "" });
  const [watchlist, setWatchlist] = useState<WatchlistRow[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [malUser, setMalUser] = useState("");
  const progressQuery = useQuery({
    queryKey: ["dashboard-progress", user?.id],
    queryFn: () => api.myProgress(100),
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  // Account fields
  const [newEmail, setNewEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);

  useEffect(() => {
    document.title = "Dashboard — Hey Anime";
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("display_name, mal_username").eq("user_id", user.id).maybeSingle();
      if (p) {
        setProfile({ display_name: p.display_name ?? "", mal_username: p.mal_username ?? "" });
        if (p.mal_username) setMalUser(p.mal_username);
      }
      const { data: wl } = await supabase.from("watchlist").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      setWatchlist((wl as WatchlistRow[]) ?? []);
    })();
  }, [user]);

  const recentProgress = useMemo(() => {
    const rows = progressQuery.data ?? [];
    const byMalId = new Map<number, ProgressRow>();
    for (const row of rows) {
      if (!byMalId.has(row.mal_id)) {
        byMalId.set(row.mal_id, row);
      }
    }
    return [...byMalId.values()];
  }, [progressQuery.data]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert(
      { user_id: user.id, display_name: profile.display_name?.trim() || null, mal_username: profile.mal_username?.trim() || null },
      { onConflict: "user_id" }
    );
    setSavingProfile(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
  };

  const importMal = async () => {
    if (!user) return;
    const name = malUser.trim();
    if (!name) { toast.error("Enter your MAL username"); return; }
    setImporting(true);
    try {
      const list = await fetchMalList(name);
      if (list.length === 0) { toast.info("No anime found on that list"); return; }
      const rows = list.map(e => ({
        user_id: user.id,
        mal_id: e.mal_id,
        title: e.title,
        image_url: e.image_url,
        status: toDbStatus(e.status),
        score: e.score || null,
        episodes_watched: e.episodes_watched || 0,
        total_episodes: e.total_episodes,
      }));
      // chunk to keep payloads small
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from("watchlist").upsert(chunk, { onConflict: "user_id,mal_id" });
        if (error) throw error;
      }
      // persist mal_username on profile
      await supabase.from("profiles").upsert({ user_id: user.id, mal_username: name }, { onConflict: "user_id" });
      const { data: wl } = await supabase.from("watchlist").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      setWatchlist((wl as WatchlistRow[]) ?? []);
      toast.success(`Imported ${rows.length} entries from MAL`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const exportJson = () => {
    if (!watchlist.length) { toast.info("Nothing to export"); return; }
    downloadFile(`hey-anime-watchlist-${Date.now()}.json`, JSON.stringify(watchlist, null, 2), "application/json");
  };
  const exportXml = () => {
    if (!watchlist.length) { toast.info("Nothing to export"); return; }
    downloadFile(`hey-anime-watchlist-${Date.now()}.xml`, buildMalXml(watchlist), "application/xml");
  };

  const removeEntry = async (id: string) => {
    const { error } = await supabase.from("watchlist").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setWatchlist(prev => prev.filter(w => w.id !== id));
  };

  const changeEmail = async () => {
    const parsed = z.string().trim().email().safeParse(newEmail);
    if (!parsed.success) { toast.error("Enter a valid email"); return; }
    setAccountBusy(true);
    const { error } = await supabase.auth.updateUser({ email: parsed.data });
    setAccountBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Confirmation sent to your new email");
    setNewEmail("");
  };

  const changePassword = async () => {
    const parsed = z.string().min(8).max(72).safeParse(newPw);
    if (!parsed.success) { toast.error("Password must be at least 8 characters"); return; }
    setAccountBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setAccountBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    setNewPw("");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    total: recentProgress.length || watchlist.length,
    completed: recentProgress.filter(r => r.completed).length || watchlist.filter(w => w.status === "completed").length,
    watching: recentProgress.filter(r => !r.completed && (r.percent ?? 0) > 0).length || watchlist.filter(w => w.status === "watching").length,
    planned: watchlist.filter(w => w.status === "plan_to_watch").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-28 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">Your library</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold">
            Hey, {profile.display_name || user.email?.split("@")[0]}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">Manage your account, sync with MyAnimeList and curate your watchlist.</p>
        </motion.div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Watching" value={stats.watching} accent />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Planned" value={stats.planned} />
        </div>

        <div className="mt-6">
          <NotificationCenter />
        </div>

        {recentProgress.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1.5">Backend progress</p>
                <h2 className="font-display text-2xl font-semibold">Recently watched</h2>
              </div>
              <p className="text-sm text-muted-foreground">Synced from your player history</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recentProgress.slice(0, 10).map((row) => (
                <Link
                  key={row.mal_id}
                  to={`/watch/${row.mal_id}?ep=${row.episode}`}
                  className="group relative overflow-hidden rounded-lg ring-1 ring-border/50 hover:ring-primary/60 transition-all"
                >
                  <div className="aspect-[2/3] bg-secondary/40">
                    {row.image_url ? (
                      <img
                        src={row.image_url}
                        alt={row.title || ""}
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
                        style={{ width: `${Math.min(100, row.percent || 0)}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="font-medium text-sm truncate">{row.title || `MAL #${row.mal_id}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.completed ? "Completed" : `Ep ${row.episode} · ${Math.round(row.percent || 0)}%`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Tabs defaultValue="library" className="mt-10">
          <TabsList className="bg-secondary/60">
            <TabsTrigger value="library"><ListChecks className="w-4 h-4 mr-2" />Library</TabsTrigger>
            <TabsTrigger value="mal"><Sparkles className="w-4 h-4 mr-2" />MAL sync</TabsTrigger>
            <TabsTrigger value="profile"><UserIcon className="w-4 h-4 mr-2" />Profile</TabsTrigger>
            <TabsTrigger value="account"><Lock className="w-4 h-4 mr-2" />Account</TabsTrigger>
          </TabsList>

          {/* LIBRARY */}
          <TabsContent value="library" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-semibold">Your watchlist</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportJson}><Download className="w-4 h-4 mr-2" />JSON</Button>
                <Button variant="outline" size="sm" onClick={exportXml}><Download className="w-4 h-4 mr-2" />MAL XML</Button>
              </div>
            </div>
            {watchlist.length === 0 ? (
              <EmptyState
                title="Your library is empty"
                desc="Import your MyAnimeList in seconds, or browse the catalog."
                action={<Button asChild className="bg-gradient-ember text-primary-foreground"><Link to="/">Browse catalog</Link></Button>}
              />
            ) : (
              <div className="grid gap-3">
                {watchlist.slice(0, 200).map(w => (
                  <div key={w.id} className="flex items-center gap-4 p-3 rounded-lg bg-card/60 ring-1 ring-border/60">
                    {w.image_url && <img src={w.image_url} alt="" loading="lazy" className="w-12 h-16 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <Link to={`/watch/${w.mal_id}`} className="text-sm font-medium hover:text-primary line-clamp-1">{w.title}</Link>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="capitalize">{w.status.replace(/_/g, " ")}</Badge>
                        {w.score ? <span>★ {w.score}/10</span> : null}
                        <span>{w.episodes_watched}{w.total_episodes ? `/${w.total_episodes}` : ""} eps</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeEntry(w.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {watchlist.length > 200 && <p className="text-xs text-muted-foreground text-center">Showing 200 of {watchlist.length}. Use export to get the full list.</p>}
              </div>
            )}
          </TabsContent>

          {/* MAL SYNC */}
          <TabsContent value="mal" className="mt-6">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold mb-2">Sync with MyAnimeList</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Import your <strong>public</strong> MAL list by username. We pull your status, score, and episode progress for every entry.
              </p>
              <div className="space-y-3">
                <Label htmlFor="mal">MAL username</Label>
                <div className="flex gap-2">
                  <Input id="mal" value={malUser} onChange={(e) => setMalUser(e.target.value)} placeholder="e.g. xinil" className="bg-secondary/50 border-border/60" />
                  <Button onClick={importMal} disabled={importing} className="bg-gradient-ember text-primary-foreground shrink-0">
                    {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Import
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: your MAL profile must be set to <em>Public</em>. Imports may take ~30 seconds for very large lists.
                </p>
              </div>

              <div className="mt-10 p-5 rounded-lg bg-card/60 ring-1 ring-border/60">
                <h3 className="font-display text-lg font-semibold mb-1">Export</h3>
                <p className="text-sm text-muted-foreground mb-4">Download your Hey Anime library as JSON or MAL-compatible XML (re-importable to MyAnimeList).</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportJson}><Download className="w-4 h-4 mr-2" />Export JSON</Button>
                  <Button variant="outline" onClick={exportXml}><Download className="w-4 h-4 mr-2" />Export MAL XML</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* PROFILE */}
          <TabsContent value="profile" className="mt-6 max-w-xl space-y-4">
            <h2 className="font-display text-2xl font-semibold mb-2">Profile</h2>
            <Field label="Display name" id="dn" value={profile.display_name ?? ""} onChange={(v) => setProfile(p => ({ ...p, display_name: v }))} />
            <Field label="MAL username" id="mu" value={profile.mal_username ?? ""} onChange={(v) => setProfile(p => ({ ...p, mal_username: v }))} hint="Linked when you import; you can change it anytime." />
            <Button onClick={saveProfile} disabled={savingProfile} className="bg-gradient-ember text-primary-foreground">
              {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save profile
            </Button>
          </TabsContent>

          {/* ACCOUNT */}
          <TabsContent value="account" className="mt-6 max-w-xl space-y-8">
            <div>
              <h2 className="font-display text-2xl font-semibold mb-1 flex items-center gap-2"><Mail className="w-5 h-5 text-primary" />Change email</h2>
              <p className="text-sm text-muted-foreground mb-3">Current: <span className="text-foreground">{user.email}</span></p>
              <div className="flex gap-2">
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" className="bg-secondary/50 border-border/60" />
                <Button onClick={changeEmail} disabled={accountBusy} variant="outline">Update</Button>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold mb-3 flex items-center gap-2"><Lock className="w-5 h-5 text-primary" />Change password</h2>
              <div className="flex gap-2">
                <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters" className="bg-secondary/50 border-border/60" />
                <Button onClick={changePassword} disabled={accountBusy} variant="outline">Update</Button>
              </div>
            </div>

            <div className="pt-6 border-t border-border/40">
              <Button variant="ghost" onClick={() => signOut().then(() => navigate("/"))} className="text-muted-foreground">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, accent }: { label: string; value: number; accent?: boolean }) => (
  <div className={`p-5 rounded-lg ring-1 ${accent ? "bg-gradient-ember text-primary-foreground ring-transparent shadow-glow" : "bg-card/60 ring-border/60"}`}>
    <p className={`text-xs uppercase tracking-widest ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
    <p className="font-display text-3xl font-semibold mt-1">{value}</p>
  </div>
);

const Field = ({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="bg-secondary/50 border-border/60" />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const EmptyState = ({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) => (
  <div className="text-center py-16 rounded-lg bg-card/40 ring-1 ring-border/40">
    <p className="font-display text-2xl font-semibold">{title}</p>
    <p className="text-sm text-muted-foreground mt-2 mb-5">{desc}</p>
    {action}
  </div>
);

export default Dashboard;
