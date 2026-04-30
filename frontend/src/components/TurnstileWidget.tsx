import { useEffect, useRef } from "react";
import { TURNSTILE_SITE_KEY, loadTurnstile, turnstileConfigured } from "@/lib/captcha";

/**
 * Cloudflare Turnstile widget. Renders nothing if not configured.
 * Calls `onToken` with a token when verified.
 */
export const TurnstileWidget = ({ onToken }: { onToken: (token: string) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileConfigured()) return;
    let cancelled = false;
    loadTurnstile().then(() => {
      if (cancelled || !ref.current || !window.turnstile || !TURNSTILE_SITE_KEY) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onToken,
      });
    });
    return () => {
      cancelled = true;
      try { if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
    };
  }, [onToken]);

  if (!turnstileConfigured()) return null;
  return <div ref={ref} className="my-2" />;
};
