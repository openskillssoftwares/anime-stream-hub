import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ResetPassword = () => {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { document.title = "Choose a new password — Hey Anime"; }, []);

  useEffect(() => {
    // Supabase puts a recovery session in place automatically when arriving via the email link.
    supabase.auth.getSession().then(({ data: { session } }) => setHasSession(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().min(8, { message: "At least 8 characters" }).max(72).safeParse(pw);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (pw !== pw2) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. You're signed in.");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-display text-xl font-semibold">Hey Anime<span className="text-primary">.</span></span>
        </Link>
        <h1 className="font-display text-3xl font-semibold mb-2">Choose a new password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {hasSession ? "Pick something strong — at least 8 characters." : "This page expects an active recovery link. Open the email link again if needed."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required className="bg-secondary/50 border-border/60" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Confirm password</Label>
            <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required className="bg-secondary/50 border-border/60" />
          </div>
          <Button type="submit" disabled={busy || !hasSession} className="w-full bg-gradient-ember text-primary-foreground shadow-glow">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update password
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
