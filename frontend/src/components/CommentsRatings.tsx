import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, Loader2, Trash2, Shield, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { api, type CommentOut, type RatingStats } from "@/lib/api";
import { getRecaptchaToken, recaptchaConfigured, turnstileConfigured } from "@/lib/captcha";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { format } from "date-fns";

export const CommentsRatings = ({ malId }: { malId: number | string }) => {
  const { user } = useAuth();

  const [stats, setStats] = useState<RatingStats>({ avg: 0, count: 0, my_rating: null });
  const [hover, setHover] = useState(0);
  const [pending, setPending] = useState(false);

  const [comments, setComments] = useState<CommentOut[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [meIsAdmin, setMeIsAdmin] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.getRating(malId), api.listComments(malId)]);
      setStats(s);
      setComments(c);
    } catch (e) {
      // silent
    }
  }, [malId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) { setMeIsAdmin(false); return; }
    api.me().then((m) => setMeIsAdmin(m.is_admin)).catch(() => setMeIsAdmin(false));
  }, [user]);

  const submitRating = async (n: number) => {
    if (!user) { toast.error("Sign in to rate"); return; }
    setPending(true);
    try {
      const next = await api.setRating(malId, n);
      setStats(next);
      toast.success(`Rated ${n}/5`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rate");
    } finally {
      setPending(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to comment"); return; }
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      let captchaToken: string | undefined;
      if (recaptchaConfigured()) {
        captchaToken = await getRecaptchaToken("comment");
      } else if (turnstileConfigured()) {
        captchaToken = turnstileToken;
        if (!captchaToken) {
          toast.error("Please complete the security check");
          setPosting(false);
          return;
        }
      }
      const c = await api.addComment(malId, body, captchaToken);
      setComments((prev) => [c, ...prev]);
      setDraft("");
      setTurnstileToken(undefined);
      toast.success("Comment posted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await api.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success("Comment removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const display = hover || stats.my_rating || 0;

  return (
    <section className="mt-12 border-t border-border/40 pt-10">
      <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">Community</h2>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        {/* Rating */}
        <div className="rounded-xl bg-card/60 ring-1 ring-border/60 p-5 backdrop-blur h-fit">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Your rating</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= display;
              return (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => submitRating(n)}
                  disabled={pending || !user}
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  className="p-1 transition-transform hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      filled ? "fill-primary text-primary" : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {stats.count > 0 ? (
              <>Community: <span className="text-foreground font-medium">{stats.avg.toFixed(2)}</span> ({stats.count} {stats.count === 1 ? "vote" : "votes"})</>
            ) : (
              "Be the first to rate"
            )}
          </p>
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to rate.
            </p>
          )}
        </div>

        {/* Comments */}
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
          </p>

          {user ? (
            <form onSubmit={submitComment} className="mb-6">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Share your thoughts on this anime…"
                rows={3}
                maxLength={2000}
                className="bg-secondary/40 border-border/60 resize-none"
              />
              <TurnstileWidget onToken={setTurnstileToken} />
              <div className="mt-3 flex justify-end">
                <Button type="submit" disabled={posting || !draft.trim()} className="bg-gradient-ember text-primary-foreground">
                  {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Post
                </Button>
              </div>
            </form>
          ) : (
            <div className="mb-6 p-4 rounded-lg bg-card/40 ring-1 ring-border/40 text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to join the conversation.
            </div>
          )}

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No comments yet — be first.</p>
              ) : (
                comments.map((c) => {
                  const isMine = user && user.id === c.user_id;
                  const canDelete = isMine || meIsAdmin;
                  return (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="p-4 rounded-lg bg-card/50 ring-1 ring-border/50"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-ember text-primary-foreground grid place-items-center text-xs font-semibold">
                            {(c.user_name || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{c.user_name || "anon"}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(c.created_at), "MMM d, yyyy 'at' HH:mm")}
                          </span>
                          {meIsAdmin && !isMine && (
                            <span className="text-[10px] uppercase tracking-widest text-accent flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => removeComment(c.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.body}</p>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
