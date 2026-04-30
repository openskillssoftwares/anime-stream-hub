// Lumen backend API client. Always uses REACT_APP_BACKEND_URL.
import { supabase } from "@/integrations/supabase/client";

const BASE = (import.meta.env.REACT_APP_BACKEND_URL as string) || "";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
    ...(await authHeader()),
  };
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).detail || ""; } catch { /* ignore */ }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- types ----
export interface CommentOut {
  id: string;
  mal_id: number;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
  approved: boolean;
}
export interface RatingStats {
  avg: number;
  count: number;
  my_rating: number | null;
}
export interface MeOut {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_banned: boolean;
}
export interface AdminUserRow {
  user_id: string;
  name?: string;
  banned: boolean;
  comments?: number;
  ratings?: number;
}
export interface AdminCommentRow extends CommentOut {
  deleted: boolean;
}
export interface BannedAnimeRow {
  mal_id: number;
  reason: string;
  banned_at: string;
}
export interface StreamOut {
  embed_url: string;
  source: "mal" | "anikoto";
  mal_id: number;
  episode: number;
  lang: "sub" | "dub";
  episode_embed_id?: string | null;
  title?: string | null;
}
export interface ProgressRow {
  mal_id: number;
  episode: number;
  current_time: number;
  duration: number;
  percent: number;
  completed: boolean;
  title?: string | null;
  image_url?: string | null;
  updated_at?: string;
}
export interface ProgressIn {
  mal_id: number;
  episode: number;
  current_time: number;
  duration: number;
  percent: number;
  completed: boolean;
  title?: string;
  image_url?: string;
}

// ---- endpoints ----
export const api = {
  health: () => req<{ ok: boolean }>("/health"),
  me: () => req<MeOut>("/me"),
  securityConfig: () => req<{ recaptcha_enabled: boolean; turnstile_enabled: boolean }>("/security/config"),

  isAnimeBlocked: (malId: number | string) =>
    req<{ blocked: boolean; reason: string }>(`/anime/${malId}/blocked`),

  // streaming
  getStream: (mal_id: number | string, ep: number, lang: "sub" | "dub" = "sub",
              source: "mal" | "anikoto" = "mal", anikoto_id?: number) => {
    const q = new URLSearchParams({
      mal_id: String(mal_id),
      ep: String(ep),
      lang,
      source,
      ...(anikoto_id ? { anikoto_id: String(anikoto_id) } : {}),
    });
    return req<StreamOut>(`/stream?${q.toString()}`);
  },
  anikotoRecent: (page = 1, per_page = 20) =>
    req<{ ok?: boolean; data?: unknown[]; pagination?: unknown }>(
      `/anikoto/recent?page=${page}&per_page=${per_page}`
    ),
  anikotoSeries: (id: number) =>
    req<{ ok?: boolean; anime?: unknown; episodes?: unknown[] }>(`/anikoto/series/${id}`),

  // progress
  saveProgress: (p: ProgressIn) =>
    req<{ ok: boolean }>("/progress", { method: "POST", body: JSON.stringify(p) }),
  myProgress: (limit = 20) => req<ProgressRow[]>(`/progress/me?limit=${limit}`),
  deleteProgress: (mal_id: number | string) =>
    req<{ ok: boolean }>(`/progress/${mal_id}`, { method: "DELETE" }),

  listComments: (malId: number | string) => req<CommentOut[]>(`/comments/${malId}`),
  addComment: (malId: number | string, body: string, captcha_token?: string) =>
    req<CommentOut>(`/comments/${malId}`, { method: "POST", body: JSON.stringify({ body, captcha_token }) }),
  deleteComment: (id: string) => req<{ ok: boolean }>(`/comments/${id}`, { method: "DELETE" }),

  getRating: (malId: number | string) => req<RatingStats>(`/ratings/${malId}`),
  setRating: (malId: number | string, score: number) =>
    req<RatingStats>(`/ratings/${malId}`, { method: "POST", body: JSON.stringify({ score }) }),

  // ---- admin ----
  adminStats: () => req<{
    comments: number; ratings: number; banned_users: number;
    banned_anime: number; flagged_events: number; active_users: number;
  }>("/admin/stats"),
  adminListUsers: () => req<AdminUserRow[]>("/admin/users"),
  adminBanUser: (user_id: string, reason = "") =>
    req<{ ok: boolean }>("/admin/users/ban", { method: "POST", body: JSON.stringify({ user_id, reason }) }),
  adminUnbanUser: (user_id: string) =>
    req<{ ok: boolean }>("/admin/users/unban", { method: "POST", body: JSON.stringify({ user_id }) }),

  adminListBannedAnime: () => req<BannedAnimeRow[]>("/admin/anime/banned"),
  adminBanAnime: (mal_id: number, reason = "") =>
    req<{ ok: boolean }>("/admin/anime/ban", { method: "POST", body: JSON.stringify({ mal_id, reason }) }),
  adminUnbanAnime: (mal_id: number) =>
    req<{ ok: boolean }>(`/admin/anime/ban/${mal_id}`, { method: "DELETE" }),

  adminListComments: () => req<AdminCommentRow[]>("/admin/comments"),
  adminApproveComment: (id: string) =>
    req<{ ok: boolean }>(`/admin/comments/${id}/approve`, { method: "POST" }),
  adminDeleteComment: (id: string) =>
    req<{ ok: boolean }>(`/admin/comments/${id}`, { method: "DELETE" }),
  adminHardDeleteComment: (id: string) =>
    req<{ ok: boolean }>(`/admin/comments/${id}/hard`, { method: "DELETE" }),
};
