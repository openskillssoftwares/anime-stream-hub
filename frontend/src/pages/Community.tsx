import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  Clock3,
  Film,
  MessageSquarePlus,
  Send,
  Users,
  MessageSquare,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type DiscussionRow } from "@/lib/api";
import { jikan } from "@/lib/jikan";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DiscussionNode extends DiscussionRow {
  replies: DiscussionNode[];
}

const buildTree = (rows: DiscussionRow[]) => {
  const map = new Map<string, DiscussionNode>();
  const roots: DiscussionNode[] = [];

  [...rows]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((row) => {
      map.set(row.id, { ...row, replies: [] });
    });

  [...rows]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((row) => {
      const node = map.get(row.id);
      if (!node) return;
      if (row.parent_id && map.has(row.parent_id)) {
        map.get(row.parent_id)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });

  return roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const timeAgo = (value: string) => {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
};

const Community = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const scope = params.get("scope") === "anime" ? "anime" : "general";
  const malId = params.get("mal_id") ? Number(params.get("mal_id")) : null;
  const animeTitle = params.get("title") || "";
  const [title, setTitle] = useState(animeTitle);
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const anime = useQuery({
    queryKey: ["community-anime", malId],
    queryFn: () => jikan.byId(malId!),
    enabled: scope === "anime" && !!malId,
  });

  const discussions = useQuery({
    queryKey: ["community-discussions", scope, malId],
    queryFn: () => api.listDiscussions({ scope, mal_id: scope === "anime" ? malId ?? undefined : undefined, limit: 250 }),
  });

  useEffect(() => {
    setTitle(animeTitle);
    setReplyingTo(null);
    setReplyBody("");
  }, [animeTitle, scope, malId]);

  const tree = useMemo(() => buildTree(discussions.data || []), [discussions.data]);

  const switchScope = (nextScope: "general" | "anime") => {
    const next = new URLSearchParams(params);
    next.set("scope", nextScope);
    if (nextScope === "general") {
      next.delete("mal_id");
      next.delete("title");
      setTitle("");
    } else if (malId) {
      next.set("mal_id", String(malId));
      if (animeTitle) next.set("title", animeTitle);
    }
    setReplyingTo(null);
    setReplyBody("");
    setParams(next, { replace: true });
  };

  const submitThread = async () => {
    if (!user) {
      toast.error("Sign in to post a discussion");
      return;
    }
    if (!body.trim()) {
      toast.error("Write something first");
      return;
    }
    if (!title.trim() && scope === "general") {
      toast.error("Add a title for your thread");
      return;
    }
    if (scope === "anime" && !malId) {
      toast.error("Open an anime from the watch page to start an anime discussion");
      return;
    }

    try {
      await api.createDiscussion({
        scope,
        mal_id: scope === "anime" ? malId ?? undefined : undefined,
        title: title.trim() || undefined,
        body: body.trim(),
      });
      toast.success("Discussion posted");
      setBody("");
      setTitle(scope === "general" ? "" : title);
      discussions.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post discussion");
    }
  };

  const submitReply = async (parentId: string) => {
    if (!user) {
      toast.error("Sign in to reply");
      return;
    }
    if (!replyBody.trim()) {
      toast.error("Write a reply first");
      return;
    }
    try {
      await api.createDiscussion({
        scope,
        mal_id: scope === "anime" ? malId ?? undefined : undefined,
        body: replyBody.trim(),
        parent_id: parentId,
      });
      toast.success("Reply posted");
      setReplyBody("");
      setReplyingTo(null);
      discussions.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post reply");
    }
  };

  const Thread = ({ node, depth = 0 }: { node: DiscussionNode; depth?: number }) => (
    <div className={depth > 0 ? "ml-6 border-l border-border/60 pl-4" : ""}>
      <Card className="bg-card/70 backdrop-blur-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="min-w-0">
              {node.title && <CardTitle className="text-lg line-clamp-2">{node.title}</CardTitle>}
              <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{node.user_name}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{timeAgo(node.created_at)}</span>
                {depth === 0 && node.reply_count ? <Badge variant="secondary">{node.reply_count} replies</Badge> : null}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setReplyingTo(node.id)}>
              Reply
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap leading-7 text-sm text-foreground/90">{node.body}</p>
          {replyingTo === node.id && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-4">
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write your reply…"
                className="min-h-[110px]"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => submitReply(node.id)}>
                  <Send className="w-4 h-4 mr-2" /> Post reply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-4 space-y-4">
        {node.replies.map((reply) => <Thread key={reply.id} node={reply} depth={depth + 1} />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-28 pb-20 space-y-8">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] items-start">
          <div className="space-y-4">
            <Badge variant="secondary" className="w-fit">Community discussion</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">Talk anime and general fandom here.</h1>
            <p className="max-w-2xl text-muted-foreground text-lg">
              Start a thread, reply to others, or jump in from a watch page to discuss the episode without using comments.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="default">
                <Link to="/community?scope=general">
                  <MessageSquare className="w-4 h-4 mr-2" /> General discussions
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={malId ? `/watch/${malId}` : "/browse"}>
                  <Film className="w-4 h-4 mr-2" /> {malId ? "Back to anime" : "Browse anime"}
                </Link>
              </Button>
            </div>
          </div>
          <Card className="bg-card/70 backdrop-blur-sm border-border/60">
            <CardHeader>
              <CardTitle className="text-xl">How this works</CardTitle>
              <CardDescription>
                General posts live here, while anime-specific threads can be opened from any watch page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Separate from comments and ratings.</div>
              <div className="flex items-center gap-2"><MessageSquarePlus className="w-4 h-4 text-primary" /> Root posts and nested replies are supported.</div>
              <div className="flex items-center gap-2"><Film className="w-4 h-4 text-primary" /> Anime threads are tied to a MAL id.</div>
            </CardContent>
          </Card>
        </motion.section>

        <Tabs value={scope} onValueChange={(value) => switchScope(value === "anime" ? "anime" : "general")}> 
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="anime">Anime</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="bg-card/70 backdrop-blur-sm border-border/60">
              <CardHeader>
                <CardTitle>Start a general discussion</CardTitle>
                <CardDescription>Share recommendations, site feedback, theories, or anything else anime-related.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title" />
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your post…" className="min-h-[150px]" />
                <div className="flex items-center gap-3">
                  <Button onClick={submitThread} disabled={!user}>
                    <Send className="w-4 h-4 mr-2" /> Post thread
                  </Button>
                  {!user && <span className="text-sm text-muted-foreground">Sign in to post.</span>}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {discussions.isLoading ? (
                <Card className="bg-card/60 border-border/60"><CardContent className="py-10 text-center text-muted-foreground">Loading threads…</CardContent></Card>
              ) : tree.length > 0 ? (
                tree.map((thread) => <Thread key={thread.id} node={thread} />)
              ) : (
                <Card className="bg-card/60 border-border/60"><CardContent className="py-10 text-center text-muted-foreground">No general discussions yet. Start the first thread.</CardContent></Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="anime" className="space-y-6">
            <Card className="bg-card/70 backdrop-blur-sm border-border/60">
              <CardHeader>
                <CardTitle>Anime discussion</CardTitle>
                <CardDescription>
                  {anime.data ? anime.data.title_english || anime.data.title : malId ? `Discussion for MAL #${malId}` : "Open this from a watch page to discuss a specific anime."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <Badge variant="secondary">Scope: anime</Badge>
                  {malId ? <Badge variant="secondary">MAL #{malId}</Badge> : null}
                  {anime.data?.status ? <Badge variant="secondary">{anime.data.status}</Badge> : null}
                </div>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title" />
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Start the conversation…" className="min-h-[150px]" />
                <div className="flex items-center gap-3">
                  <Button onClick={submitThread} disabled={!user || !malId}>
                    <Send className="w-4 h-4 mr-2" /> Post thread
                  </Button>
                  {malId ? (
                    <Button asChild variant="outline">
                      <Link to={`/watch/${malId}`}>Open player</Link>
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Open from an anime page to begin an anime thread.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {discussions.isLoading ? (
                <Card className="bg-card/60 border-border/60"><CardContent className="py-10 text-center text-muted-foreground">Loading anime discussions…</CardContent></Card>
              ) : tree.length > 0 ? (
                tree.map((thread) => <Thread key={thread.id} node={thread} />)
              ) : (
                <Card className="bg-card/60 border-border/60"><CardContent className="py-10 text-center text-muted-foreground">No anime discussions yet for this title.</CardContent></Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Community;
