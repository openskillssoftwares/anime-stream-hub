import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Mail, MessageSquare, Shield, Zap, Send, CheckCircle } from "lucide-react";

const CONTACT_EMAIL = "heyanime@proton.me";

const reasons = [
  {
    icon: MessageSquare,
    label: "General Support",
    subject: "Support Request",
    description: "Questions, bugs, or anything else",
  },
  {
    icon: Shield,
    label: "DMCA / Copyright",
    subject: "DMCA Takedown Request",
    description: "Content removal requests",
  },
  {
    icon: Zap,
    label: "Urgent Issue",
    subject: "Urgent Issue",
    description: "Site outages or critical bugs",
  },
  {
    icon: Mail,
    label: "Other",
    subject: "General Inquiry",
    description: "Partnerships, feedback, anything else",
  },
];

const Contact = () => {
  const [selected, setSelected] = useState(0);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    const subject = encodeURIComponent(reasons[selected].subject);
    const body = encodeURIComponent(
      `Name: ${name || "Anonymous"}\n\n${message}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <main className="container relative z-10 pt-28 pb-24 max-w-3xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">Get in touch</p>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-balance leading-tight">
            Contact Us
          </h1>
          <p className="mt-4 text-muted-foreground max-w-lg leading-relaxed">
            Have a question, spotted an issue, or need to report content? We're here.
            Pick a reason below and send us a message.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-8">

          {/* Left — reason picker + direct email */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 space-y-3"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Reason</p>
            {reasons.map((r, i) => {
              const Icon = r.icon;
              const active = selected === i;
              return (
                <button
                  key={r.label}
                  onClick={() => setSelected(i)}
                  className={`w-full text-left rounded-xl px-4 py-3.5 transition-all duration-200 ring-1 ${
                    active
                      ? "bg-primary/10 ring-primary/40 text-foreground"
                      : "bg-card/40 ring-border/40 text-muted-foreground hover:bg-card/70 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : ""}`} />
                    <div>
                      <p className="text-sm font-medium leading-none mb-0.5">{r.label}</p>
                      <p className="text-xs opacity-60">{r.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Direct email */}
            <div className="mt-6 rounded-xl bg-card/40 ring-1 ring-border/40 px-4 py-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Or email directly</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-sm text-primary hover:underline break-all"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </motion.div>

          {/* Right — compose form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-3 rounded-2xl bg-card/60 ring-1 ring-border/60 backdrop-blur p-6 space-y-5"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Subject</p>
              <p className="text-sm font-medium text-foreground">{reasons[selected].subject}</p>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Your name <span className="normal-case opacity-50">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Anonymous"
                className="w-full rounded-lg bg-background/60 ring-1 ring-border/60 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-primary/50 transition-all"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Message <span className="text-primary">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  selected === 1
                    ? "Please include the anime title, episode, and infringing URL..."
                    : "Describe your issue or question in detail..."
                }
                rows={6}
                className="w-full rounded-lg bg-background/60 ring-1 ring-border/60 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-primary/50 transition-all resize-none"
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all duration-200 ${
                sent
                  ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                  : message.trim()
                  ? "bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow"
                  : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
              }`}
            >
              {sent ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Opening your mail app…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send via Email
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground/50 text-center">
              Clicking send opens your default mail app with the message pre-filled.
            </p>
          </motion.div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center text-xs text-muted-foreground/40"
        >
          Hey Anime — We typically respond within 48 hours.
        </motion.p>
      </main>
    </div>
  );
};

export default Contact;
