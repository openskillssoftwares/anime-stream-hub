import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { document.title = "Forgot password — Lumen"; }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-display text-xl font-semibold">Lumen<span className="text-primary">.</span></span>
        </Link>
        <h1 className="font-display text-3xl font-semibold mb-2">Reset your password</h1>
        <p className="text-sm text-muted-foreground mb-6">We'll email you a secure link to choose a new password.</p>

        {sent ? (
          <div className="p-5 rounded-lg bg-card/60 ring-1 ring-border/60">
            <p className="font-medium">Check your inbox</p>
            <p className="text-sm text-muted-foreground mt-2">If an account exists for <span className="text-foreground">{email}</span>, a reset link is on its way.</p>
            <Button variant="ghost" onClick={() => navigate("/auth")} className="mt-4 -ml-3"><ArrowLeft className="w-4 h-4 mr-2" />Back to sign in</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-secondary/50 border-border/60" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-ember text-primary-foreground shadow-glow">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send reset link
            </Button>
            <Link to="/auth" className="block text-sm text-center text-muted-foreground hover:text-foreground transition-colors">Back to sign in</Link>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
