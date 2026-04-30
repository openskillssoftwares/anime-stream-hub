// reCAPTCHA v3 + Cloudflare Turnstile loaders.
// Both are no-ops if the matching site key env var is missing.

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
    turnstile?: {
      render: (container: string | HTMLElement, opts: {
        sitekey: string;
        callback: (token: string) => void;
        "error-callback"?: () => void;
      }) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const RECAPTCHA_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

let recaptchaLoading: Promise<void> | null = null;
let turnstileLoading: Promise<void> | null = null;

export const recaptchaConfigured = () => !!RECAPTCHA_KEY;
export const turnstileConfigured = () => !!TURNSTILE_KEY;

export function loadRecaptcha(): Promise<void> {
  if (!RECAPTCHA_KEY) return Promise.resolve();
  if (recaptchaLoading) return recaptchaLoading;
  recaptchaLoading = new Promise((resolve, reject) => {
    if (window.grecaptcha) return resolve();
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_KEY}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("recaptcha load failed"));
    document.head.appendChild(s);
  });
  return recaptchaLoading;
}

export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!RECAPTCHA_KEY) return undefined;
  await loadRecaptcha();
  return new Promise((resolve) => {
    window.grecaptcha?.ready(async () => {
      try {
        const token = await window.grecaptcha!.execute(RECAPTCHA_KEY, { action });
        resolve(token);
      } catch {
        resolve(undefined);
      }
    });
  });
}

export function loadTurnstile(): Promise<void> {
  if (!TURNSTILE_KEY) return Promise.resolve();
  if (turnstileLoading) return turnstileLoading;
  turnstileLoading = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile load failed"));
    document.head.appendChild(s);
  });
  return turnstileLoading;
}

export const TURNSTILE_SITE_KEY = TURNSTILE_KEY;
