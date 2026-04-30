#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Dynamic anime streaming website using megaplay.buzz iframe + Jikan/MAL data.
  Phase 1 scope (this iteration):
    - Keep existing Supabase auth (login, register, forgot/reset, change email/pwd, MAL public-username import/export)
    - Add MongoDB-backed FastAPI for: comments, 5-star ratings, admin moderation
    - Admin gate: ADMIN_EMAIL=admin@lumen.local
    - Anime block list (admin can ban a MAL ID; player shows "unavailable" when blocked)
    - reCAPTCHA v3 + Cloudflare Turnstile stubs (disabled until keys provided)
    - Lottie hero accent + interactive starfield/ember background
    - AdSense slot placeholders (real ads load only when VITE_ADSENSE_PUB_ID provided)

backend:
  - task: "Health & security config endpoints"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/, /api/health, /api/security/config (returns recaptcha_enabled/turnstile_enabled flags). No auth required."

  - task: "Supabase JWT-based auth middleware"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Validates user JWT by calling SUPABASE_URL/auth/v1/user with apikey + Bearer token. /api/me returns AuthedUser (id, email, name, is_admin, is_banned). Admin = email == ADMIN_EMAIL (admin@lumen.local). Endpoints requiring auth must respond 401 on missing/invalid bearer."

  - task: "Comments CRUD"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/comments/{mal_id} (public, hides deleted). POST /api/comments/{mal_id} requires JWT, optional captcha_token (no-op when secrets empty). DELETE /api/comments/{id} for owner OR admin."

  - task: "Ratings (1..5)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/ratings/{mal_id} returns {avg,count,my_rating}. POST upserts (one per user per anime). Score must be 1..5, anything outside should 422."

  - task: "Anime block check"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/anime/{mal_id}/blocked → {blocked, reason}. Public endpoint. Block managed via /api/admin/anime/ban (POST) and /api/admin/anime/ban/{mal_id} (DELETE)."

  - task: "Admin moderation endpoints"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "/api/admin/stats, /admin/users (list+ban+unban), /admin/anime/banned (list+ban+unban), /admin/comments (list+approve+soft delete+hard delete). All require admin (403 for non-admin users)."

frontend:
  - task: "Home: trending/new/season/top/upcoming + interactive bg + hero lottie + ad slot"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Index.tsx, components/InteractiveBackground.tsx, components/FlameLottie.tsx, components/AdSlot.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added New Releases row, AdSlot placeholder mid-page, animated starfield bg, flame Lottie accent in hero. Verified renders in screenshot."

  - task: "Watch: comments + 5-star ratings + block check + ad sidebar"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Watch.tsx, components/CommentsRatings.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Iframe still uses megaplay.buzz/stream/s-2/{malId}/sub. Pre-checks /api/anime/{id}/blocked and shows ban screen if blocked. Comments+ratings component shown below."

  - task: "Admin page /admin"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Admin.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Tabs: Comments / Users / Anime gate. Stats cards. Auto-redirects non-admins. Navbar shows admin entry only if /api/me is_admin true."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Health & security config endpoints"
    - "Supabase JWT-based auth middleware"
    - "Comments CRUD"
    - "Ratings (1..5)"
    - "Anime block check"
    - "Admin moderation endpoints"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Phase 1 backend complete. Please test all backend endpoints listed in test_plan.
      Important details for testing:
      - Backend uses Supabase JWT validation via SUPABASE_URL/auth/v1/user. To test authenticated endpoints,
        you need to sign up via Supabase first. Suggested approach:
        1) POST https://nkpnuyvjotjyvledrrwp.supabase.co/auth/v1/signup with apikey header (anon key from frontend/.env) and JSON {email,password}
           This returns access_token. Use it as Bearer for /api/me, /api/comments, /api/ratings.
        2) For ADMIN tests, sign up "admin@lumen.local" → that user becomes admin (ADMIN_EMAIL match).
        3) For non-admin test, sign up any other email.
      - Anon key (apikey header) is the one in /app/frontend/.env VITE_SUPABASE_PUBLISHABLE_KEY.
      - Captcha is disabled (no secrets), so POST comment with no captcha_token must succeed.
      - Validate that ratings reject score 0 and 6 with 422 (Pydantic conint).
      - Validate that DELETE /api/comments/{id} by non-owner non-admin returns 403.
      - Validate that admin endpoints return 403 for non-admin users.
      - DB name is "lumen_db" — please make sure to use endpoints, not direct DB inserts.
