import { useEffect, useRef } from "react";

/**
 * AdSense slot. Renders nothing if VITE_ADSENSE_PUB_ID is missing.
 * Use sparingly: hero break + below-fold on home, plus 1 in watch sidebar.
 */
declare global {
  interface Window {
    adsbygoogle?: unknown[];
    __adsense_loaded?: boolean;
  }
}

const PUB_ID = import.meta.env.VITE_ADSENSE_PUB_ID as string | undefined;

const ensureScript = () => {
  if (!PUB_ID || typeof window === "undefined") return;
  if (window.__adsense_loaded) return;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB_ID}`;
  document.head.appendChild(s);
  window.__adsense_loaded = true;
};

interface AdSlotProps {
  slot: string;
  format?: string;
  className?: string;
  layout?: string;
}

export const AdSlot = ({ slot, format = "auto", className = "", layout }: AdSlotProps) => {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!PUB_ID) return;
    ensureScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* swallowed */
    }
  }, []);

  if (!PUB_ID) {
    // Dev-friendly placeholder so you can see where ads go without showing real ads.
    return (
      <div
        className={`flex items-center justify-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 border border-dashed border-border/40 rounded-md ${className}`}
        style={{ minHeight: 90 }}
        aria-hidden
      >
        Ad slot
      </div>
    );
  }

  return (
    <ins
      ref={ref as unknown as React.RefObject<HTMLModElement>}
      className={`adsbygoogle ${className}`}
      style={{ display: "block" }}
      data-ad-client={PUB_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
      {...(layout ? { "data-ad-layout": layout } : {})}
    />
  );
};
