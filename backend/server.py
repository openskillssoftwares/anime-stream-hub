"""
Lumen anime backend — comments, ratings, admin moderation, security stubs.

Auth model:
- Users are stored & authenticated by Supabase (frontend uses Supabase JS).
- This backend validates the user's Supabase JWT by calling
  https://{SUPABASE_URL}/auth/v1/user with the token. No JWT secret needed.
- Admin = user whose Supabase email == ADMIN_EMAIL env.

Storage: MongoDB collections
- comments       : per-anime comments
- ratings        : per-user per-anime 1..5 stars
- banned_users   : list of banned supabase user_ids
- banned_anime   : list of banned mal_ids (cannot be streamed)
- security_log   : recaptcha / turnstile failures
"""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, conint, constr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@lumen.local').lower()
RECAPTCHA_SECRET = os.environ.get('RECAPTCHA_SECRET', '')
TURNSTILE_SECRET = os.environ.get('TURNSTILE_SECRET', '')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Lumen API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("lumen")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class CommentIn(BaseModel):
    body: constr(strip_whitespace=True, min_length=1, max_length=2000)
    captcha_token: Optional[str] = None  # reCAPTCHA v3 or Turnstile


class CommentOut(BaseModel):
    id: str
    mal_id: int
    user_id: str
    user_name: str
    body: str
    created_at: datetime
    approved: bool = True


class RatingIn(BaseModel):
    score: conint(ge=1, le=5)


class RatingStats(BaseModel):
    avg: float
    count: int
    my_rating: Optional[int] = None


class BanAnimeIn(BaseModel):
    mal_id: int
    reason: Optional[str] = ""


class BanUserIn(BaseModel):
    user_id: str
    reason: Optional[str] = ""


class AuthedUser(BaseModel):
    id: str
    email: str
    name: str
    is_admin: bool
    is_banned: bool


# ---------------------------------------------------------------------------
# Auth helper — validate Supabase JWT via /auth/v1/user
# ---------------------------------------------------------------------------
async def _is_user_banned(user_id: str) -> bool:
    return await db.banned_users.find_one({"user_id": user_id}) is not None


async def get_current_user(authorization: Optional[str] = Header(None)) -> AuthedUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        # Misconfigured server
        raise HTTPException(status_code=503, detail="Auth not configured on server")

    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            r = await http.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY,
                },
            )
    except Exception as e:
        logger.exception("Supabase auth call failed")
        raise HTTPException(status_code=502, detail=f"Auth provider unreachable: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    data = r.json()
    user_id = data.get("id")
    email = (data.get("email") or "").lower()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    meta = data.get("user_metadata") or {}
    name = meta.get("name") or meta.get("full_name") or (email.split("@")[0] if email else "anon")

    banned = await _is_user_banned(user_id)
    is_admin = bool(email) and email == ADMIN_EMAIL

    return AuthedUser(
        id=user_id, email=email, name=name,
        is_admin=is_admin, is_banned=banned,
    )


async def require_admin(user: AuthedUser = Depends(get_current_user)) -> AuthedUser:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user


async def require_active(user: AuthedUser = Depends(get_current_user)) -> AuthedUser:
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Your account is banned")
    return user


# ---------------------------------------------------------------------------
# Captcha verification (no-op when secrets are absent)
# ---------------------------------------------------------------------------
async def verify_captcha(token: Optional[str], remote_ip: Optional[str]) -> bool:
    """Verify reCAPTCHA v3 OR Cloudflare Turnstile token. Skipped if no secret set."""
    if not RECAPTCHA_SECRET and not TURNSTILE_SECRET:
        return True  # security stub mode
    if not token:
        return False
    async with httpx.AsyncClient(timeout=8.0) as http:
        # Try reCAPTCHA first
        if RECAPTCHA_SECRET:
            try:
                r = await http.post(
                    "https://www.google.com/recaptcha/api/siteverify",
                    data={"secret": RECAPTCHA_SECRET, "response": token,
                          **({"remoteip": remote_ip} if remote_ip else {})},
                )
                if r.json().get("success"):
                    return True
            except Exception:
                pass
        if TURNSTILE_SECRET:
            try:
                r = await http.post(
                    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                    data={"secret": TURNSTILE_SECRET, "response": token,
                          **({"remoteip": remote_ip} if remote_ip else {})},
                )
                if r.json().get("success"):
                    return True
            except Exception:
                pass
    return False


# ---------------------------------------------------------------------------
# Public health
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "lumen", "time": datetime.utcnow().isoformat()}


@api_router.get("/health")
async def health():
    return {"ok": True}


# ---------------------------------------------------------------------------
# Anime moderation lookup (used by player)
# ---------------------------------------------------------------------------
@api_router.get("/anime/{mal_id}/blocked")
async def is_anime_blocked(mal_id: int):
    found = await db.banned_anime.find_one({"mal_id": mal_id})
    return {"blocked": bool(found), "reason": (found or {}).get("reason", "")}


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------
@api_router.get("/comments/{mal_id}", response_model=List[CommentOut])
async def list_comments(mal_id: int):
    rows = await db.comments.find(
        {"mal_id": mal_id, "approved": {"$ne": False}, "deleted": {"$ne": True}}
    ).sort("created_at", -1).to_list(200)
    return [CommentOut(**{
        "id": r["id"], "mal_id": r["mal_id"], "user_id": r["user_id"],
        "user_name": r.get("user_name", "anon"), "body": r["body"],
        "created_at": r["created_at"], "approved": r.get("approved", True),
    }) for r in rows]


@api_router.post("/comments/{mal_id}", response_model=CommentOut)
async def create_comment(mal_id: int, payload: CommentIn, request: Request,
                         user: AuthedUser = Depends(require_active)):
    ok = await verify_captcha(payload.captcha_token, request.client.host if request.client else None)
    if not ok:
        await db.security_log.insert_one({
            "id": str(uuid.uuid4()), "type": "captcha_fail",
            "user_id": user.id, "mal_id": mal_id, "ts": datetime.utcnow(),
        })
        raise HTTPException(status_code=400, detail="Captcha verification failed")

    doc = {
        "id": str(uuid.uuid4()),
        "mal_id": mal_id,
        "user_id": user.id,
        "user_name": user.name,
        "body": payload.body,
        "created_at": datetime.utcnow(),
        "approved": True,
        "deleted": False,
    }
    await db.comments.insert_one(doc)
    return CommentOut(**doc)


@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: AuthedUser = Depends(get_current_user)):
    row = await db.comments.find_one({"id": comment_id})
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if row["user_id"] != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.comments.update_one({"id": comment_id}, {"$set": {"deleted": True}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Ratings
# ---------------------------------------------------------------------------
@api_router.get("/ratings/{mal_id}", response_model=RatingStats)
async def get_rating(mal_id: int, authorization: Optional[str] = Header(None)):
    pipeline = [
        {"$match": {"mal_id": mal_id}},
        {"$group": {"_id": "$mal_id", "avg": {"$avg": "$score"}, "count": {"$sum": 1}}},
    ]
    agg = await db.ratings.aggregate(pipeline).to_list(1)
    avg = round(agg[0]["avg"], 2) if agg else 0.0
    count = agg[0]["count"] if agg else 0

    my_rating = None
    if authorization:
        try:
            user = await get_current_user(authorization)
            mine = await db.ratings.find_one({"mal_id": mal_id, "user_id": user.id})
            my_rating = mine["score"] if mine else None
        except HTTPException:
            pass
    return RatingStats(avg=avg, count=count, my_rating=my_rating)


async def _rating_stats(mal_id: int, user_id: Optional[str]) -> RatingStats:
    pipeline = [
        {"$match": {"mal_id": mal_id}},
        {"$group": {"_id": "$mal_id", "avg": {"$avg": "$score"}, "count": {"$sum": 1}}},
    ]
    agg = await db.ratings.aggregate(pipeline).to_list(1)
    avg = round(agg[0]["avg"], 2) if agg else 0.0
    count = agg[0]["count"] if agg else 0
    my_rating = None
    if user_id:
        mine = await db.ratings.find_one({"mal_id": mal_id, "user_id": user_id})
        my_rating = mine["score"] if mine else None
    return RatingStats(avg=avg, count=count, my_rating=my_rating)


@api_router.post("/ratings/{mal_id}", response_model=RatingStats)
async def upsert_rating(mal_id: int, payload: RatingIn,
                        user: AuthedUser = Depends(require_active)):
    await db.ratings.update_one(
        {"user_id": user.id, "mal_id": mal_id},
        {"$set": {"score": payload.score, "updated_at": datetime.utcnow()},
         "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": datetime.utcnow(),
                          "user_id": user.id, "mal_id": mal_id}},
        upsert=True,
    )
    return await _rating_stats(mal_id, user.id)


# ---------------------------------------------------------------------------
# Me / who am I
# ---------------------------------------------------------------------------
@api_router.get("/me")
async def me(user: AuthedUser = Depends(get_current_user)):
    return user.dict()


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
@api_router.get("/admin/stats")
async def admin_stats(_: AuthedUser = Depends(require_admin)):
    comments = await db.comments.count_documents({})
    ratings = await db.ratings.count_documents({})
    banned_users = await db.banned_users.count_documents({})
    banned_anime = await db.banned_anime.count_documents({})
    flagged = await db.security_log.count_documents({})
    # distinct users from comments/ratings
    user_ids = set()
    async for r in db.comments.find({}, {"user_id": 1}):
        user_ids.add(r.get("user_id"))
    async for r in db.ratings.find({}, {"user_id": 1}):
        user_ids.add(r.get("user_id"))
    return {
        "comments": comments,
        "ratings": ratings,
        "banned_users": banned_users,
        "banned_anime": banned_anime,
        "flagged_events": flagged,
        "active_users": len(user_ids),
    }


@api_router.get("/admin/users")
async def admin_list_users(_: AuthedUser = Depends(require_admin)):
    """Return users seen via comments/ratings + banned status."""
    seen: Dict[str, Dict[str, Any]] = {}
    async for r in db.comments.find({}, {"user_id": 1, "user_name": 1}):
        uid = r.get("user_id")
        if uid and uid not in seen:
            seen[uid] = {"user_id": uid, "name": r.get("user_name", ""), "comments": 0}
        if uid:
            seen[uid]["comments"] = seen[uid].get("comments", 0) + 1
    async for r in db.ratings.find({}, {"user_id": 1}):
        uid = r.get("user_id")
        if uid and uid not in seen:
            seen[uid] = {"user_id": uid, "name": "", "ratings": 0}
        if uid:
            seen[uid]["ratings"] = seen[uid].get("ratings", 0) + 1
    banned = {b["user_id"] async for b in db.banned_users.find({}, {"user_id": 1})}
    out = []
    for uid, info in seen.items():
        out.append({**info, "banned": uid in banned})
    # also include explicitly banned but unseen
    async for b in db.banned_users.find({}):
        if b["user_id"] not in seen:
            out.append({"user_id": b["user_id"], "name": b.get("name", ""),
                        "banned": True, "comments": 0, "ratings": 0})
    return out


@api_router.post("/admin/users/ban")
async def admin_ban_user(payload: BanUserIn, _: AuthedUser = Depends(require_admin)):
    await db.banned_users.update_one(
        {"user_id": payload.user_id},
        {"$set": {"user_id": payload.user_id, "reason": payload.reason or "",
                  "banned_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"ok": True}


@api_router.post("/admin/users/unban")
async def admin_unban_user(payload: BanUserIn, _: AuthedUser = Depends(require_admin)):
    await db.banned_users.delete_one({"user_id": payload.user_id})
    return {"ok": True}


@api_router.get("/admin/anime/banned")
async def admin_list_banned_anime(_: AuthedUser = Depends(require_admin)):
    rows = await db.banned_anime.find({}).sort("banned_at", -1).to_list(500)
    return [{"mal_id": r["mal_id"], "reason": r.get("reason", ""),
             "banned_at": r.get("banned_at")} for r in rows]


@api_router.post("/admin/anime/ban")
async def admin_ban_anime(payload: BanAnimeIn, _: AuthedUser = Depends(require_admin)):
    await db.banned_anime.update_one(
        {"mal_id": payload.mal_id},
        {"$set": {"mal_id": payload.mal_id, "reason": payload.reason or "",
                  "banned_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"ok": True}


@api_router.delete("/admin/anime/ban/{mal_id}")
async def admin_unban_anime(mal_id: int, _: AuthedUser = Depends(require_admin)):
    await db.banned_anime.delete_one({"mal_id": mal_id})
    return {"ok": True}


@api_router.get("/admin/comments")
async def admin_list_comments(_: AuthedUser = Depends(require_admin)):
    rows = await db.comments.find({}).sort("created_at", -1).to_list(500)
    return [{
        "id": r["id"], "mal_id": r["mal_id"], "user_id": r["user_id"],
        "user_name": r.get("user_name", ""), "body": r["body"],
        "created_at": r["created_at"], "approved": r.get("approved", True),
        "deleted": r.get("deleted", False),
    } for r in rows]


@api_router.post("/admin/comments/{comment_id}/approve")
async def admin_approve_comment(comment_id: str, _: AuthedUser = Depends(require_admin)):
    await db.comments.update_one({"id": comment_id},
                                 {"$set": {"approved": True, "deleted": False}})
    return {"ok": True}


@api_router.delete("/admin/comments/{comment_id}")
async def admin_delete_comment(comment_id: str, _: AuthedUser = Depends(require_admin)):
    await db.comments.update_one({"id": comment_id}, {"$set": {"deleted": True}})
    return {"ok": True}


@api_router.delete("/admin/comments/{comment_id}/hard")
async def admin_hard_delete_comment(comment_id: str, _: AuthedUser = Depends(require_admin)):
    await db.comments.delete_one({"id": comment_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Security config exposure (frontend reads these to know whether to show widgets)
# ---------------------------------------------------------------------------
@api_router.get("/security/config")
async def security_config():
    return {
        "recaptcha_enabled": bool(RECAPTCHA_SECRET),
        "turnstile_enabled": bool(TURNSTILE_SECRET),
    }


# ---------------------------------------------------------------------------
# Wire up
# ---------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    # indexes
    await db.comments.create_index([("mal_id", 1), ("created_at", -1)])
    await db.ratings.create_index([("mal_id", 1), ("user_id", 1)], unique=True)
    await db.banned_users.create_index("user_id", unique=True)
    await db.banned_anime.create_index("mal_id", unique=True)
    logger.info("Lumen API ready. Admin email: %s", ADMIN_EMAIL)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
