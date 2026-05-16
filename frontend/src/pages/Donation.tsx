import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Heart, Zap, Star, Coffee, X, Shield, Server, Tv } from "lucide-react";

const perks = [
  { icon: Server, text: "Keeps servers online 24/7" },
  { icon: Tv, text: "Funds new streaming sources" },
  { icon: Zap, text: "Faster performance & updates" },
  { icon: Shield, text: "No paywalls — free for everyone" },
];

const tiers = [
  { label: "Coffee", amount: 50, icon: Coffee, desc: "Buy us a chai ☕" },
  { label: "Supporter", amount: 150, icon: Heart, desc: "Keep the lights on 💡" },
  { label: "Hero", amount: 500, icon: Star, desc: "You're a legend 🌟" },
];

const Donation = () => {
  const [open, setOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(1); // default: Supporter
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const placeholder = placeholderRef.current;
    if (!placeholder) return;

    // Clear previous
    placeholder.innerHTML = "";

    const formEl = document.createElement("form");
    const scriptEl = document.createElement("script");
    scriptEl.src = "https://checkout.razorpay.com/v1/payment-button.js";
    scriptEl.setAttribute("data-payment_button_id", "pl_Sjh0RTRsVWhTDX");
    scriptEl.async = true;
    formEl.appendChild(scriptEl);
    placeholder.appendChild(formEl);

    return () => {
      try { placeholder.innerHTML = ""; } catch {}
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tier = tiers[selectedTier];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/5 blur-[140px]" />
      </div>

      <main className="container relative z-10 pt-28 pb-24 max-w-3xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">Keep us alive</p>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-balance leading-tight">
            Support Hey Anime
          </h1>
          <p className="mt-4 text-muted-foreground max-w-lg leading-relaxed">
            Hey Anime is completely free and ad-light. Your donation directly funds
            servers, bandwidth, and new features — no fluff, no middleman.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-8">

          {/* Left — perks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 space-y-4"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Where it goes</p>
            {perks.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.text} className="flex items-center gap-3 rounded-xl bg-card/40 ring-1 ring-border/40 px-4 py-3">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground/80">{p.text}</span>
                </div>
              );
            })}

            <div className="mt-6 rounded-xl bg-primary/10 ring-1 ring-primary/30 px-4 py-4 text-center">
              <Heart className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Every rupee counts.</p>
              <p className="text-xs text-muted-foreground mt-1">Minimum donation: ₹50</p>
            </div>
          </motion.div>

          {/* Right — tier picker + donate button */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-3 rounded-2xl bg-card/60 ring-1 ring-border/60 backdrop-blur p-6 space-y-5"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Choose an amount</p>

            {/* Tier cards */}
            <div className="grid grid-cols-3 gap-3">
              {tiers.map((t, i) => {
                const Icon = t.icon;
                const active = selectedTier === i;
                return (
                  <button
                    key={t.label}
                    onClick={() => setSelectedTier(i)}
                    className={`rounded-xl px-3 py-4 text-center transition-all duration-200 ring-1 ${
                      active
                        ? "bg-primary/10 ring-primary/50 text-foreground"
                        : "bg-background/40 ring-border/40 text-muted-foreground hover:bg-card/70 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-2 ${active ? "text-primary" : ""}`} />
                    <p className="text-xs font-medium">{t.label}</p>
                    <p className={`text-lg font-bold mt-0.5 ${active ? "text-primary" : ""}`}>₹{t.amount}</p>
                    <p className="text-[10px] opacity-60 mt-0.5 leading-tight">{t.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Selected summary */}
            <div className="rounded-xl bg-background/40 ring-1 ring-border/40 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Selected</span>
              <span className="text-sm font-semibold">{tier.label} — ₹{tier.amount}</span>
            </div>

            {/* Donate CTA */}
            <button
              onClick={() => setOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 bg-gradient-ember text-primary-foreground font-medium text-sm hover:opacity-90 transition-all shadow-glow"
            >
              <Heart className="w-4 h-4" />
              Donate ₹{tier.amount} via Razorpay
            </button>

            <p className="text-xs text-muted-foreground/50 text-center">
              Secure payment powered by Razorpay · UPI, cards, netbanking accepted
            </p>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center text-xs text-muted-foreground/40"
        >
          Hey Anime — Thank you for keeping anime free for everyone 💙
        </motion.p>
      </main>

      {/* Razorpay Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-2xl bg-background ring-1 ring-border/60 p-6 relative"
            >
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <Heart className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-display text-2xl font-semibold mb-1">
                {tier.label} — ₹{tier.amount}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {tier.desc} — Thank you for supporting Hey Anime!
              </p>

              {/* Razorpay button injected here */}
              <div
                ref={placeholderRef}
                className="flex justify-center [&_form]:w-full [&_button]:w-full [&_button]:rounded-xl [&_button]:py-3"
              />

              <p className="text-xs text-muted-foreground/50 text-center mt-4">
                Powered by Razorpay · 100% secure
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Donation;
