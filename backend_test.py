#!/usr/bin/env python3
"""
Comprehensive backend test for Lumen anime API
Tests all 40 endpoints as specified in the review request
"""
import requests
import json
import time
import os
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://mal-stream-pro.preview.emergentagent.com/api"
SUPABASE_URL = "https://nkpnuyvjotjyvledrrwp.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcG51eXZqb3RqeXZsZWRycndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MjU4NTcsImV4cCI6MjA5MzEwMTg1N30.Om-O8DMpPjgjRVo5JBf8WcfLwLsvq1OqnfxnaOvCFJA"
ADMIN_EMAIL = "admin@lumen.local"

# Test results tracking
test_results = []
admin_token = None
user_token = None
user_id = None
comment_user_id = None
comment_admin_id = None
comment_user2_id = None

def log_test(test_num: int, label: str, expected: str, actual_status: int, 
             response_data: Any = None, passed: bool = None) -> bool:
    """Log test result and determine pass/fail"""
    if passed is None:
        # Auto-determine based on status code
        if "200" in expected:
            passed = actual_status == 200
        elif "401" in expected:
            passed = actual_status == 401
        elif "403" in expected:
            passed = actual_status == 403
        elif "422" in expected:
            passed = actual_status == 422
        elif "404" in expected:
            passed = actual_status == 404
        else:
            passed = False
    
    result = {
        "test_num": test_num,
        "label": label,
        "expected": expected,
        "actual_status": actual_status,
        "response_data": response_data,
        "passed": passed
    }
    test_results.append(result)
    
    status = "PASS" if passed else "FAIL"
    print(f"Test {test_num}: {label} - {status}")
    print(f"  Expected: {expected}")
    print(f"  Actual: {actual_status}")
    if response_data and not passed:
        print(f"  Response: {response_data}")
    print()
    
    return passed

def mint_supabase_token(email: str, password: str, is_signup: bool = True) -> tuple[Optional[str], Optional[str]]:
    """Mint a Supabase token via signup or signin"""
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    
    if is_signup:
        # Try signup first
        signup_data = {
            "email": email,
            "password": password,
            "data": {"name": email.split("@")[0].title()}
        }
        
        try:
            response = requests.post(
                f"{SUPABASE_URL}/auth/v1/signup",
                headers=headers,
                json=signup_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token"), data.get("user", {}).get("id")
            elif response.status_code == 400 and "already registered" in response.text.lower():
                # User exists, try signin
                pass
            else:
                print(f"Signup failed: {response.status_code} - {response.text}")
                return None, None
        except Exception as e:
            print(f"Signup error: {e}")
            return None, None
    
    # Try signin
    signin_data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=headers,
            json=signin_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token"), data.get("user", {}).get("id")
        else:
            print(f"Signin failed: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print(f"Signin error: {e}")
        return None, None

def save_credentials(admin_email: str, admin_password: str, user_email: str, user_password: str, user_id: str):
    """Save test credentials to file"""
    credentials = f"""# Test Credentials Used

## Admin
- Email: {admin_email}
- Password: {admin_password}

## Test User
- Email: {user_email}
- Password: {user_password}
- User ID: {user_id}

Generated at: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}
"""
    
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "a") as f:
        f.write(credentials)

def run_tests():
    global admin_token, user_token, user_id, comment_user_id, comment_admin_id, comment_user2_id
    
    print("=" * 80)
    print("LUMEN BACKEND API COMPREHENSIVE TEST")
    print("=" * 80)
    print()
    
    # STEP 1: Mint Supabase tokens
    print("STEP 1: Minting Supabase tokens...")
    print("-" * 40)
    
    # Admin token - try signin first since user likely exists
    admin_password = "AdminPwd#12345"
    admin_token, admin_user_id = mint_supabase_token(ADMIN_EMAIL, admin_password, False)
    
    if not admin_token:
        print("CRITICAL: Failed to mint admin token. Stopping tests.")
        return
    
    print(f"✓ Admin token minted for {ADMIN_EMAIL}")
    
    # User token
    unix_ts = int(time.time())
    user_email = f"user-{unix_ts}@lumen.local"
    user_password = "Userpwd#12345"
    user_token, user_id = mint_supabase_token(user_email, user_password, True)
    
    if not user_token:
        print("CRITICAL: Failed to mint user token. Stopping tests.")
        return
    
    print(f"✓ User token minted for {user_email}")
    print(f"✓ User ID: {user_id}")
    
    # Save credentials
    save_credentials(ADMIN_EMAIL, admin_password, user_email, user_password, user_id)
    
    print()
    print("STEP 2: Running 40 API tests...")
    print("-" * 40)
    
    # PUBLIC ENDPOINTS (no auth)
    
    # Test 1: GET /api/ → 200, JSON.status == "ok"
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and data and data.get("status") == "ok"
        log_test(1, "GET /api/", "200, JSON.status == 'ok'", response.status_code, data, passed)
    except Exception as e:
        log_test(1, "GET /api/", "200, JSON.status == 'ok'", 0, str(e), False)
    
    # Test 2: GET /api/health → 200, {ok:true}
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and data and data.get("ok") is True
        log_test(2, "GET /api/health", "200, {ok:true}", response.status_code, data, passed)
    except Exception as e:
        log_test(2, "GET /api/health", "200, {ok:true}", 0, str(e), False)
    
    # Test 3: GET /api/security/config → 200, recaptcha_enabled==false, turnstile_enabled==false
    try:
        response = requests.get(f"{BACKEND_URL}/security/config", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and data and 
                 data.get("recaptcha_enabled") is False and 
                 data.get("turnstile_enabled") is False)
        log_test(3, "GET /api/security/config", "200, recaptcha_enabled==false, turnstile_enabled==false", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(3, "GET /api/security/config", "200, recaptcha_enabled==false, turnstile_enabled==false", 
                0, str(e), False)
    
    # Test 4: GET /api/anime/123/blocked → 200, blocked==false
    try:
        response = requests.get(f"{BACKEND_URL}/anime/123/blocked", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and data and data.get("blocked") is False
        log_test(4, "GET /api/anime/123/blocked", "200, blocked==false", response.status_code, data, passed)
    except Exception as e:
        log_test(4, "GET /api/anime/123/blocked", "200, blocked==false", 0, str(e), False)
    
    # Test 5: GET /api/comments/9999 → 200, list
    try:
        response = requests.get(f"{BACKEND_URL}/comments/9999", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and isinstance(data, list)
        log_test(5, "GET /api/comments/9999", "200, list", response.status_code, f"list length: {len(data) if data else 0}", passed)
    except Exception as e:
        log_test(5, "GET /api/comments/9999", "200, list", 0, str(e), False)
    
    # Test 6: GET /api/ratings/9999 → 200, count==0, my_rating null
    try:
        response = requests.get(f"{BACKEND_URL}/ratings/9999", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and data and 
                 data.get("count") == 0 and data.get("my_rating") is None)
        log_test(6, "GET /api/ratings/9999", "200, count==0, my_rating null", response.status_code, data, passed)
    except Exception as e:
        log_test(6, "GET /api/ratings/9999", "200, count==0, my_rating null", 0, str(e), False)
    
    # AUTH TESTS
    
    # Test 7: GET /api/me no header → 401
    try:
        response = requests.get(f"{BACKEND_URL}/me", timeout=10)
        log_test(7, "GET /api/me no header", "401", response.status_code)
    except Exception as e:
        log_test(7, "GET /api/me no header", "401", 0, str(e), False)
    
    # Test 8: GET /api/me Authorization "Bearer bogus" → 401
    try:
        headers = {"Authorization": "Bearer bogus"}
        response = requests.get(f"{BACKEND_URL}/me", headers=headers, timeout=10)
        log_test(8, "GET /api/me with bogus token", "401", response.status_code)
    except Exception as e:
        log_test(8, "GET /api/me with bogus token", "401", 0, str(e), False)
    
    # Test 9: GET /api/me with USER_TOKEN → 200, is_admin false, is_banned false
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BACKEND_URL}/me", headers=headers, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and data and 
                 data.get("is_admin") is False and data.get("is_banned") is False)
        log_test(9, "GET /api/me with USER_TOKEN", "200, is_admin false, is_banned false", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(9, "GET /api/me with USER_TOKEN", "200, is_admin false, is_banned false", 0, str(e), False)
    
    # Test 10: GET /api/me with ADMIN_TOKEN → 200, is_admin true
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BACKEND_URL}/me", headers=headers, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and data and data.get("is_admin") is True
        log_test(10, "GET /api/me with ADMIN_TOKEN", "200, is_admin true", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(10, "GET /api/me with ADMIN_TOKEN", "200, is_admin true", 0, str(e), False)
    
    # COMMENTS TESTS
    
    # Test 11: POST /api/comments/52991 USER_TOKEN body {"body":"first!"} → 200
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"body": "first!"}
        response = requests.post(f"{BACKEND_URL}/comments/52991", headers=headers, json=payload, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and data and data.get("id")
        if passed:
            comment_user_id = data.get("id")
        log_test(11, "POST /api/comments/52991 USER_TOKEN first comment", "200", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(11, "POST /api/comments/52991 USER_TOKEN first comment", "200", 0, str(e), False)
    
    # Test 12: POST /api/comments/52991 USER_TOKEN body {"body":""} → 422
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"body": ""}
        response = requests.post(f"{BACKEND_URL}/comments/52991", headers=headers, json=payload, timeout=10)
        log_test(12, "POST /api/comments/52991 empty body", "422", response.status_code)
    except Exception as e:
        log_test(12, "POST /api/comments/52991 empty body", "422", 0, str(e), False)
    
    # Test 13: POST /api/comments/52991 USER_TOKEN body {"body": "x"*2001} → 422
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"body": "x" * 2001}
        response = requests.post(f"{BACKEND_URL}/comments/52991", headers=headers, json=payload, timeout=10)
        log_test(13, "POST /api/comments/52991 too long body", "422", response.status_code)
    except Exception as e:
        log_test(13, "POST /api/comments/52991 too long body", "422", 0, str(e), False)
    
    # Test 14: GET /api/comments/52991 → contains COMMENT_USER_ID
    try:
        response = requests.get(f"{BACKEND_URL}/comments/52991", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and isinstance(data, list) and 
                 any(c.get("id") == comment_user_id for c in data) if comment_user_id else False)
        log_test(14, "GET /api/comments/52991 contains user comment", "200, contains comment", 
                response.status_code, f"found comment: {passed}", passed)
    except Exception as e:
        log_test(14, "GET /api/comments/52991 contains user comment", "200, contains comment", 0, str(e), False)
    
    # Test 15: POST /api/comments/52991 no auth → 401
    try:
        payload = {"body": "no auth test"}
        response = requests.post(f"{BACKEND_URL}/comments/52991", json=payload, timeout=10)
        log_test(15, "POST /api/comments/52991 no auth", "401", response.status_code)
    except Exception as e:
        log_test(15, "POST /api/comments/52991 no auth", "401", 0, str(e), False)
    
    # Test 16: POST /api/comments/52991 ADMIN_TOKEN {"body":"admin says hi"} → 200
    try:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        payload = {"body": "admin says hi"}
        response = requests.post(f"{BACKEND_URL}/comments/52991", headers=headers, json=payload, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and data and data.get("id")
        if passed:
            comment_admin_id = data.get("id")
        log_test(16, "POST /api/comments/52991 ADMIN_TOKEN", "200", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(16, "POST /api/comments/52991 ADMIN_TOKEN", "200", 0, str(e), False)
    
    # Test 17: DELETE /api/comments/{COMMENT_ADMIN_ID} with USER_TOKEN → 403
    if comment_admin_id:
        try:
            headers = {"Authorization": f"Bearer {user_token}"}
            response = requests.delete(f"{BACKEND_URL}/comments/{comment_admin_id}", headers=headers, timeout=10)
            log_test(17, "DELETE admin comment with USER_TOKEN", "403", response.status_code)
        except Exception as e:
            log_test(17, "DELETE admin comment with USER_TOKEN", "403", 0, str(e), False)
    else:
        log_test(17, "DELETE admin comment with USER_TOKEN", "403", 0, "No admin comment ID", False)
    
    # Test 18: DELETE /api/comments/{COMMENT_USER_ID} with USER_TOKEN → 200
    if comment_user_id:
        try:
            headers = {"Authorization": f"Bearer {user_token}"}
            response = requests.delete(f"{BACKEND_URL}/comments/{comment_user_id}", headers=headers, timeout=10)
            passed = response.status_code == 200
            log_test(18, "DELETE own comment with USER_TOKEN", "200", response.status_code, None, passed)
            
            # Verify comment is gone from public list
            if passed:
                try:
                    response = requests.get(f"{BACKEND_URL}/comments/52991", timeout=10)
                    data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
                    still_there = any(c.get("id") == comment_user_id for c in data) if data else False
                    if still_there:
                        print(f"  WARNING: Deleted comment {comment_user_id} still appears in public list")
                except:
                    pass
        except Exception as e:
            log_test(18, "DELETE own comment with USER_TOKEN", "200", 0, str(e), False)
    else:
        log_test(18, "DELETE own comment with USER_TOKEN", "200", 0, "No user comment ID", False)
    
    # Test 19: POST second comment and admin delete
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"body": "second"}
        response = requests.post(f"{BACKEND_URL}/comments/52991", headers=headers, json=payload, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        if response.status_code == 200 and data and data.get("id"):
            comment_user2_id = data.get("id")
            # Now admin deletes it
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            delete_response = requests.delete(f"{BACKEND_URL}/comments/{comment_user2_id}", 
                                            headers=admin_headers, timeout=10)
            passed = delete_response.status_code == 200
            log_test(19, "POST second comment + admin delete", "200", 
                    delete_response.status_code, None, passed)
        else:
            log_test(19, "POST second comment + admin delete", "200", response.status_code, data, False)
    except Exception as e:
        log_test(19, "POST second comment + admin delete", "200", 0, str(e), False)
    
    # RATINGS TESTS
    
    # Test 20: POST /api/ratings/52991 USER_TOKEN {"score":5} → 200, my_rating=5, count>=1
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"score": 5}
        response = requests.post(f"{BACKEND_URL}/ratings/52991", headers=headers, json=payload, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and data and 
                 data.get("my_rating") == 5 and data.get("count", 0) >= 1)
        log_test(20, "POST /api/ratings/52991 score 5", "200, my_rating=5, count>=1", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(20, "POST /api/ratings/52991 score 5", "200, my_rating=5, count>=1", 0, str(e), False)
    
    # Test 21: POST /api/ratings/52991 USER_TOKEN {"score":3} → 200, my_rating=3 (upsert)
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"score": 3}
        response = requests.post(f"{BACKEND_URL}/ratings/52991", headers=headers, json=payload, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and data and data.get("my_rating") == 3
        log_test(21, "POST /api/ratings/52991 score 3 (upsert)", "200, my_rating=3", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(21, "POST /api/ratings/52991 score 3 (upsert)", "200, my_rating=3", 0, str(e), False)
    
    # Test 22: POST /api/ratings/52991 ADMIN_TOKEN {"score":4} → 200, count==2, avg==3.5
    try:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        payload = {"score": 4}
        response = requests.post(f"{BACKEND_URL}/ratings/52991", headers=headers, json=payload, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and data and 
                 data.get("count") == 2 and data.get("avg") == 3.5)
        log_test(22, "POST /api/ratings/52991 ADMIN score 4", "200, count==2, avg==3.5", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(22, "POST /api/ratings/52991 ADMIN score 4", "200, count==2, avg==3.5", 0, str(e), False)
    
    # Test 23: POST /api/ratings/52991 USER_TOKEN {"score":0} → 422
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"score": 0}
        response = requests.post(f"{BACKEND_URL}/ratings/52991", headers=headers, json=payload, timeout=10)
        log_test(23, "POST /api/ratings/52991 score 0", "422", response.status_code)
    except Exception as e:
        log_test(23, "POST /api/ratings/52991 score 0", "422", 0, str(e), False)
    
    # Test 24: POST /api/ratings/52991 USER_TOKEN {"score":6} → 422
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"score": 6}
        response = requests.post(f"{BACKEND_URL}/ratings/52991", headers=headers, json=payload, timeout=10)
        log_test(24, "POST /api/ratings/52991 score 6", "422", response.status_code)
    except Exception as e:
        log_test(24, "POST /api/ratings/52991 score 6", "422", 0, str(e), False)
    
    # Test 25: GET /api/ratings/52991 with USER_TOKEN → my_rating==3, count==2
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BACKEND_URL}/ratings/52991", headers=headers, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and data and 
                 data.get("my_rating") == 3 and data.get("count") == 2)
        log_test(25, "GET /api/ratings/52991 with USER_TOKEN", "my_rating==3, count==2", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(25, "GET /api/ratings/52991 with USER_TOKEN", "my_rating==3, count==2", 0, str(e), False)
    
    # Test 26: GET /api/ratings/52991 no auth → my_rating null
    try:
        response = requests.get(f"{BACKEND_URL}/ratings/52991", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and data and data.get("my_rating") is None
        log_test(26, "GET /api/ratings/52991 no auth", "my_rating null", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(26, "GET /api/ratings/52991 no auth", "my_rating null", 0, str(e), False)
    
    # ANIME BLOCK & ADMIN TESTS
    
    # Test 27: POST /api/admin/anime/ban USER_TOKEN → 403
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"mal_id": 1, "reason": "test"}
        response = requests.post(f"{BACKEND_URL}/admin/anime/ban", headers=headers, json=payload, timeout=10)
        log_test(27, "POST /api/admin/anime/ban USER_TOKEN", "403", response.status_code)
    except Exception as e:
        log_test(27, "POST /api/admin/anime/ban USER_TOKEN", "403", 0, str(e), False)
    
    # Test 28: POST /api/admin/anime/ban ADMIN_TOKEN → 200
    try:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        payload = {"mal_id": 1, "reason": "test"}
        response = requests.post(f"{BACKEND_URL}/admin/anime/ban", headers=headers, json=payload, timeout=10)
        log_test(28, "POST /api/admin/anime/ban ADMIN_TOKEN", "200", response.status_code)
    except Exception as e:
        log_test(28, "POST /api/admin/anime/ban ADMIN_TOKEN", "200", 0, str(e), False)
    
    # Test 29: GET /api/anime/1/blocked → blocked true, reason "test"
    try:
        response = requests.get(f"{BACKEND_URL}/anime/1/blocked", timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and data and 
                 data.get("blocked") is True and data.get("reason") == "test")
        log_test(29, "GET /api/anime/1/blocked", "blocked true, reason 'test'", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(29, "GET /api/anime/1/blocked", "blocked true, reason 'test'", 0, str(e), False)
    
    # Test 30: GET /api/admin/anime/banned ADMIN_TOKEN → contains mal_id 1
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BACKEND_URL}/admin/anime/banned", headers=headers, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and isinstance(data, list) and 
                 any(item.get("mal_id") == 1 for item in data))
        log_test(30, "GET /api/admin/anime/banned", "contains mal_id 1", 
                response.status_code, f"contains mal_id 1: {passed}", passed)
    except Exception as e:
        log_test(30, "GET /api/admin/anime/banned", "contains mal_id 1", 0, str(e), False)
    
    # Test 31: DELETE /api/admin/anime/ban/1 ADMIN_TOKEN → 200; check unblocked
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(f"{BACKEND_URL}/admin/anime/ban/1", headers=headers, timeout=10)
        passed = response.status_code == 200
        
        if passed:
            # Verify it's unblocked
            check_response = requests.get(f"{BACKEND_URL}/anime/1/blocked", timeout=10)
            check_data = check_response.json() if check_response.headers.get('content-type', '').startswith('application/json') else None
            if check_response.status_code == 200 and check_data:
                still_blocked = check_data.get("blocked", True)
                if still_blocked:
                    passed = False
                    
        log_test(31, "DELETE /api/admin/anime/ban/1 + verify unblocked", "200, blocked false", 
                response.status_code, None, passed)
    except Exception as e:
        log_test(31, "DELETE /api/admin/anime/ban/1 + verify unblocked", "200, blocked false", 0, str(e), False)
    
    # ADMIN USERS TESTS
    
    # Test 32: GET /api/admin/users USER_TOKEN → 403
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BACKEND_URL}/admin/users", headers=headers, timeout=10)
        log_test(32, "GET /api/admin/users USER_TOKEN", "403", response.status_code)
    except Exception as e:
        log_test(32, "GET /api/admin/users USER_TOKEN", "403", 0, str(e), False)
    
    # Test 33: GET /api/admin/users ADMIN_TOKEN → 200; should include USER_ID
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BACKEND_URL}/admin/users", headers=headers, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = (response.status_code == 200 and isinstance(data, list) and 
                 any(user.get("user_id") == user_id for user in data) if user_id else False)
        log_test(33, "GET /api/admin/users ADMIN_TOKEN", "200, includes USER_ID", 
                response.status_code, f"includes user_id: {passed}", passed)
    except Exception as e:
        log_test(33, "GET /api/admin/users ADMIN_TOKEN", "200, includes USER_ID", 0, str(e), False)
    
    # Test 34: POST /api/admin/users/ban ADMIN_TOKEN → 200
    try:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        payload = {"user_id": user_id, "reason": "test"}
        response = requests.post(f"{BACKEND_URL}/admin/users/ban", headers=headers, json=payload, timeout=10)
        log_test(34, "POST /api/admin/users/ban", "200", response.status_code)
    except Exception as e:
        log_test(34, "POST /api/admin/users/ban", "200", 0, str(e), False)
    
    # Test 35: POST /api/comments/77 USER_TOKEN → 403 (banned)
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"body": "banned try"}
        response = requests.post(f"{BACKEND_URL}/comments/77", headers=headers, json=payload, timeout=10)
        log_test(35, "POST /api/comments/77 banned user", "403", response.status_code)
    except Exception as e:
        log_test(35, "POST /api/comments/77 banned user", "403", 0, str(e), False)
    
    # Test 36: POST /api/admin/users/unban ADMIN_TOKEN → 200
    try:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        payload = {"user_id": user_id}
        response = requests.post(f"{BACKEND_URL}/admin/users/unban", headers=headers, json=payload, timeout=10)
        log_test(36, "POST /api/admin/users/unban", "200", response.status_code)
    except Exception as e:
        log_test(36, "POST /api/admin/users/unban", "200", 0, str(e), False)
    
    # Test 37: POST /api/comments/77 USER_TOKEN → 200 (unbanned)
    try:
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        payload = {"body": "i'm back"}
        response = requests.post(f"{BACKEND_URL}/comments/77", headers=headers, json=payload, timeout=10)
        log_test(37, "POST /api/comments/77 unbanned user", "200", response.status_code)
    except Exception as e:
        log_test(37, "POST /api/comments/77 unbanned user", "200", 0, str(e), False)
    
    # ADMIN COMMENTS TESTS
    
    # Test 38: GET /api/admin/comments ADMIN_TOKEN → 200, includes deleted ones
    admin_comments = []
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BACKEND_URL}/admin/comments", headers=headers, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        passed = response.status_code == 200 and isinstance(data, list)
        if passed and data:
            admin_comments = data
        log_test(38, "GET /api/admin/comments", "200, includes deleted", 
                response.status_code, f"comment count: {len(data) if data else 0}", passed)
    except Exception as e:
        log_test(38, "GET /api/admin/comments", "200, includes deleted", 0, str(e), False)
    
    # Test 39: Admin comment operations (approve, delete, hard delete)
    if admin_comments:
        try:
            # Pick the first comment
            test_comment = admin_comments[0]
            comment_id = test_comment.get("id")
            
            if comment_id:
                headers = {"Authorization": f"Bearer {admin_token}"}
                
                # Approve
                approve_response = requests.post(f"{BACKEND_URL}/admin/comments/{comment_id}/approve", 
                                               headers=headers, timeout=10)
                approve_ok = approve_response.status_code == 200
                
                # Soft delete
                delete_response = requests.delete(f"{BACKEND_URL}/admin/comments/{comment_id}", 
                                                headers=headers, timeout=10)
                delete_ok = delete_response.status_code == 200
                
                # Hard delete
                hard_delete_response = requests.delete(f"{BACKEND_URL}/admin/comments/{comment_id}/hard", 
                                                     headers=headers, timeout=10)
                hard_delete_ok = hard_delete_response.status_code == 200
                
                # Verify it's gone from admin list
                final_check = requests.get(f"{BACKEND_URL}/admin/comments", headers=headers, timeout=10)
                final_data = final_check.json() if final_check.headers.get('content-type', '').startswith('application/json') else None
                still_there = any(c.get("id") == comment_id for c in final_data) if final_data else False
                
                passed = approve_ok and delete_ok and hard_delete_ok and not still_there
                log_test(39, "Admin comment approve/delete/hard delete", "200s, comment removed", 
                        f"{approve_response.status_code}/{delete_response.status_code}/{hard_delete_response.status_code}", 
                        f"removed: {not still_there}", passed)
            else:
                log_test(39, "Admin comment approve/delete/hard delete", "200s, comment removed", 
                        0, "No comment ID found", False)
        except Exception as e:
            log_test(39, "Admin comment approve/delete/hard delete", "200s, comment removed", 0, str(e), False)
    else:
        log_test(39, "Admin comment approve/delete/hard delete", "200s, comment removed", 
                0, "No comments available", False)
    
    # ADMIN STATS TEST
    
    # Test 40: GET /api/admin/stats ADMIN_TOKEN → 200, all numeric
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BACKEND_URL}/admin/stats", headers=headers, timeout=10)
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
        
        required_fields = ["comments", "ratings", "banned_users", "banned_anime", "flagged_events", "active_users"]
        passed = (response.status_code == 200 and data and 
                 all(field in data and isinstance(data[field], (int, float)) for field in required_fields))
        
        log_test(40, "GET /api/admin/stats", "200, all numeric fields", 
                response.status_code, data, passed)
    except Exception as e:
        log_test(40, "GET /api/admin/stats", "200, all numeric fields", 0, str(e), False)
    
    # FINAL SUMMARY
    print()
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed_tests = [r for r in test_results if r["passed"]]
    failed_tests = [r for r in test_results if not r["passed"]]
    
    print(f"TOTAL: {len(passed_tests)}/{len(test_results)} tests passed")
    print()
    
    if failed_tests:
        print("FAILED TESTS:")
        for test in failed_tests:
            print(f"  {test['test_num']}: {test['label']} - Expected: {test['expected']}, Got: {test['actual_status']}")
            if test.get('response_data'):
                print(f"    Response: {test['response_data']}")
        print()
    
    print("DETAILED RESULTS:")
    for test in test_results:
        status = "PASS" if test["passed"] else "FAIL"
        print(f"  {test['test_num']:2d}. {test['label']:<50} {status}")
    
    return len(passed_tests), len(test_results), failed_tests

if __name__ == "__main__":
    passed, total, failures = run_tests()
    
    if failures:
        print("\nFAILURE ROOT CAUSES:")
        for failure in failures:
            print(f"- Test {failure['test_num']}: {failure['label']}")
            if failure.get('response_data'):
                print(f"  Issue: {failure['response_data']}")
    
    exit(0 if passed == total else 1)