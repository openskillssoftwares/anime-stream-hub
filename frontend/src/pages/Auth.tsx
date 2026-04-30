import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import heroImg from "@/assets/hero-anime.jpg";
import { loadRecaptcha, recaptchaConfigured } from "@/lib/captcha";

const schema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  password: z.string().min(8, { message: "At least 8 characters" }).max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.title = "Sign in — Lumen";
    if (user) navigate("/", { replace: true });
    if (recaptchaConfigured()) loadRecaptcha().catch(() => {});
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate("/", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created — you're in.");
    navigate("/", { replace: true });
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Google sign-in failed"); setOauthLoading(false); return; }
    if (result.redirected) return;
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left visual panel */}
      <div className="relative hidden lg:block overflow-hidden">
        <img src={heroImg} alt="" className="w-full h-full object-cover animate-slow-pan" />
        <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-background/20 to-background/80" />
        <div className="absolute inset-0 bg-grain opacity-30 mix-blend-overlay" />
        <div className="absolute bottom-12 left-12 right-12">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-display text-2xl font-semibold">Lumen<span className="text-primary">.</span></span>
          </Link>
          <h2 className="font-display text-4xl xl:text-5xl font-semibold leading-tight max-w-md text-balance">
            Stories worth losing sleep over.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            Sign in to track your watchlist, rate episodes and sync with MyAnimeList.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-8">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-display text-xl font-semibold">Lumen<span className="text-primary">.</span></span>
          </Link>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/60">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <h1 className="font-display text-3xl font-semibold mb-1">Welcome back</h1>
              <p className="text-sm text-muted-foreground mb-6">Continue your watchlist where you left off.</p>
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field id="email-in" label="Email" type="email" value={email} onChange={setEmail} />
                <Field id="pw-in" label="Password" type="password" value={password} onChange={setPassword} />
                <Button type="submit" disabled={loading} className="w-full bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </form>
              <Link to="/forgot-password" className="block mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Forgot your password?
              </Link>
            </TabsContent>

            <TabsContent value="signup">
              <h1 className="font-display text-3xl font-semibold mb-1">Create your account</h1>
              <p className="text-sm text-muted-foreground mb-6">Free forever. Your taste, your library.</p>
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field id="email-up" label="Email" type="email" value={email} onChange={setEmail} />
                <Field id="pw-up" label="Password" type="password" value={password} onChange={setPassword} hint="At least 8 characters" />
                <Button type="submit" disabled={loading} className="w-full bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-widest">
            <div className="h-px bg-border flex-1" /> or <div className="h-px bg-border flex-1" />
          </div>

          <Button variant="outline" onClick={handleGoogle} disabled={oauthLoading} className="w-full border-border/60">
            {oauthLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <p className="mt-8 text-xs text-muted-foreground text-center">
            By continuing you agree to our terms and privacy policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const Field = ({ id, label, type, value, onChange, hint }: { id: string; label: string; type: string; value: string; onChange: (v: string) => void; hint?: string }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required className="bg-secondary/50 border-border/60" />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 11v3.4h5.4c-.2 1.3-1.6 3.8-5.4 3.8a6.2 6.2 0 1 1 0-12.4c2 0 3.3.8 4 1.5l2.7-2.6A9.3 9.3 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.1-1.2-.2-1.7H12z"/></svg>
);

export default Auth;
