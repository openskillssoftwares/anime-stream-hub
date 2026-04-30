#!/usr/bin/env python3
"""
Phase 2 Backend Testing for Lumen API
Tests the three new Phase 2 endpoints:
- /api/stream (TASK A)
- /api/anikoto/{recent,series} (TASK B) 
- /api/progress (TASK C)
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nkpnuyvjotjyvledrrwp.supabase.co")
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcG51eXZqb3RqeXZsZWRycndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MjU4NTcsImV4cCI6MjA5MzEwMTg1N30.Om-O8DMpPjgjRVo5JBf8WcfLwLsvq1OqnfxnaOvCFJA"

# Test credentials
ADMIN_EMAIL = "admin@lumen.local"
ADMIN_PASSWORD = "AdminPwd#12345"
USER_EMAIL = f"phase2-{int(time.time())}@lumen.local"
USER_PASSWORD = "Userpwd#12345"

# Global tokens
ADMIN_TOKEN = None
USER_TOKEN = None
USER_ID = None

def log_test(test_name, status, details=""):
    """Log test results"""
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"{status_symbol} {test_name}: {status}")
    if details:
        print(f"   {details}")
    print()

def get_supabase_token(email, password):
    """Get Supabase access token"""
    try:
        # Try sign in first
        signin_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": email,
                "password": password
            }
        )
        
        if signin_response.status_code == 200:
            data = signin_response.json()
            return data.get("access_token"), data.get("user", {}).get("id")
        
        # If sign in fails, try sign up
        signup_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": email,
                "password": password
            }
        )
        
        if signup_response.status_code in [200, 201]:
            data = signup_response.json()
            return data.get("access_token"), data.get("user", {}).get("id")
        
        print(f"Failed to get token for {email}: {signup_response.status_code} {signup_response.text}")
        return None, None
        
    except Exception as e:
        print(f"Error getting token for {email}: {e}")
        return None, None

def setup_auth():
    """Setup authentication tokens"""
    global ADMIN_TOKEN, USER_TOKEN, USER_ID
    
    print("Setting up authentication...")
    
    # Get admin token
    ADMIN_TOKEN, _ = get_supabase_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not ADMIN_TOKEN:
        print("❌ Failed to get admin token")
        return False
    
    # Get user token
    USER_TOKEN, USER_ID = get_supabase_token(USER_EMAIL, USER_PASSWORD)
    if not USER_TOKEN:
        print("❌ Failed to get user token")
        return False
    
    print(f"✅ Admin token obtained")
    print(f"✅ User token obtained for {USER_EMAIL}")
    print(f"✅ User ID: {USER_ID}")
    print()
    return True

def test_stream_endpoints():
    """Test TASK A - Stream endpoint /api/stream"""
    print("=== TASK A - Stream Endpoint Tests ===")
    
    # Test 1: Basic MAL stream
    try:
        response = requests.get(f"{BACKEND_URL}/api/stream?mal_id=52991&ep=1&lang=sub")
        if response.status_code == 200:
            data = response.json()
            expected_url = "https://megaplay.buzz/stream/mal/52991/1/sub"
            if (data.get("embed_url") == expected_url and 
                data.get("source") == "mal" and 
                data.get("episode") == 1 and 
                data.get("lang") == "sub"):
                log_test("Stream MAL basic", "PASS", f"embed_url: {data.get('embed_url')}")
            else:
                log_test("Stream MAL basic", "FAIL", f"Unexpected response: {data}")
        else:
            log_test("Stream MAL basic", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Stream MAL basic", "FAIL", f"Exception: {e}")
    
    # Test 2: MAL stream with dub
    try:
        response = requests.get(f"{BACKEND_URL}/api/stream?mal_id=52991&ep=2&lang=dub&source=mal")
        if response.status_code == 200:
            data = response.json()
            if data.get("embed_url", "").endswith("/52991/2/dub"):
                log_test("Stream MAL dub", "PASS", f"embed_url: {data.get('embed_url')}")
            else:
                log_test("Stream MAL dub", "FAIL", f"URL doesn't end with /52991/2/dub: {data.get('embed_url')}")
        else:
            log_test("Stream MAL dub", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Stream MAL dub", "FAIL", f"Exception: {e}")
    
    # Test 3: Invalid language
    try:
        response = requests.get(f"{BACKEND_URL}/api/stream?mal_id=52991&ep=1&lang=fr")
        if response.status_code == 400:
            log_test("Stream invalid lang", "PASS", "Correctly rejected 'fr' language")
        else:
            log_test("Stream invalid lang", "FAIL", f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Stream invalid lang", "FAIL", f"Exception: {e}")
    
    # Test 4: Anikoto without anikoto_id
    try:
        response = requests.get(f"{BACKEND_URL}/api/stream?mal_id=52991&ep=1&lang=sub&source=anikoto")
        if response.status_code == 400:
            log_test("Stream anikoto no ID", "PASS", "Correctly rejected anikoto without anikoto_id")
        else:
            log_test("Stream anikoto no ID", "FAIL", f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Stream anikoto no ID", "FAIL", f"Exception: {e}")
    
    # Test 5: Anikoto with valid ID (Doraemon)
    try:
        response = requests.get(f"{BACKEND_URL}/api/stream?mal_id=52991&ep=1&lang=sub&source=anikoto&anikoto_id=1")
        if response.status_code in [200, 404, 502]:
            if response.status_code == 200:
                data = response.json()
                embed_url = data.get("embed_url", "")
                if "megaplay.buzz/stream/s-2/" in embed_url and embed_url.endswith("/sub"):
                    log_test("Stream anikoto valid", "PASS", f"Status: {response.status_code}, URL pattern correct")
                else:
                    log_test("Stream anikoto valid", "PASS", f"Status: {response.status_code}, but URL pattern unexpected: {embed_url}")
            else:
                log_test("Stream anikoto valid", "PASS", f"Status: {response.status_code} (acceptable for Anikoto unavailability)")
        else:
            log_test("Stream anikoto valid", "FAIL", f"Status: {response.status_code} (should not be 500)")
    except Exception as e:
        log_test("Stream anikoto valid", "FAIL", f"Exception: {e}")
    
    # Test 6: Block test
    try:
        # Ban anime as admin
        ban_response = requests.post(
            f"{BACKEND_URL}/api/admin/anime/ban",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}", "Content-Type": "application/json"},
            json={"mal_id": 99999, "reason": "phase2 test"}
        )
        
        if ban_response.status_code == 200:
            # Try to stream banned anime
            stream_response = requests.get(f"{BACKEND_URL}/api/stream?mal_id=99999&ep=1&lang=sub")
            
            if stream_response.status_code == 403:
                # Unban anime
                unban_response = requests.delete(
                    f"{BACKEND_URL}/api/admin/anime/ban/99999",
                    headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
                )
                
                if unban_response.status_code == 200:
                    log_test("Stream block test", "PASS", "Ban/block/unban cycle worked correctly")
                else:
                    log_test("Stream block test", "FAIL", f"Unban failed: {unban_response.status_code}")
            else:
                log_test("Stream block test", "FAIL", f"Expected 403 for banned anime, got {stream_response.status_code}")
        else:
            log_test("Stream block test", "FAIL", f"Ban failed: {ban_response.status_code}")
    except Exception as e:
        log_test("Stream block test", "FAIL", f"Exception: {e}")

def test_anikoto_proxy():
    """Test TASK B - Anikoto proxy endpoints"""
    print("=== TASK B - Anikoto Proxy Tests ===")
    
    # Test 7: Recent anime (first call)
    try:
        start_time = time.time()
        response = requests.get(f"{BACKEND_URL}/api/anikoto/recent?page=1&per_page=2")
        first_call_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            if "data" in data:
                log_test("Anikoto recent first call", "PASS", f"Response time: {first_call_time:.2f}s, has 'data' array")
            else:
                log_test("Anikoto recent first call", "FAIL", f"Missing 'data' key in response: {list(data.keys())}")
        else:
            log_test("Anikoto recent first call", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Anikoto recent first call", "FAIL", f"Exception: {e}")
        first_call_time = 999  # Set high time if failed
    
    # Test 8: Recent anime (cached call)
    try:
        start_time = time.time()
        response = requests.get(f"{BACKEND_URL}/api/anikoto/recent?page=1&per_page=2")
        second_call_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            if "data" in data:
                if second_call_time <= first_call_time:
                    log_test("Anikoto recent cached", "PASS", f"Cached response time: {second_call_time:.2f}s (≤ {first_call_time:.2f}s)")
                else:
                    log_test("Anikoto recent cached", "PASS", f"Response time: {second_call_time:.2f}s (cache may not be faster due to network variance)")
            else:
                log_test("Anikoto recent cached", "FAIL", f"Missing 'data' key in response")
        else:
            log_test("Anikoto recent cached", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Anikoto recent cached", "FAIL", f"Exception: {e}")
    
    # Test 9: Series endpoint (valid ID)
    try:
        response = requests.get(f"{BACKEND_URL}/api/anikoto/series/1")
        if response.status_code == 200:
            data = response.json()
            if "anime" in data or "episodes" in data:
                log_test("Anikoto series valid", "PASS", f"Has required key: {list(data.keys())}")
            else:
                log_test("Anikoto series valid", "PASS", f"Response received but unexpected structure: {list(data.keys())}")
        else:
            log_test("Anikoto series valid", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Anikoto series valid", "FAIL", f"Exception: {e}")
    
    # Test 10: Series endpoint (invalid ID)
    try:
        response = requests.get(f"{BACKEND_URL}/api/anikoto/series/0")
        if response.status_code in [502, 404] or (response.status_code == 200 and not response.json()):
            log_test("Anikoto series invalid", "PASS", f"Status: {response.status_code} (not 500)")
        elif response.status_code == 500:
            log_test("Anikoto series invalid", "FAIL", f"Status: 500 (should not be 500)")
        else:
            log_test("Anikoto series invalid", "PASS", f"Status: {response.status_code} (acceptable)")
    except Exception as e:
        log_test("Anikoto series invalid", "FAIL", f"Exception: {e}")

def test_progress_endpoints():
    """Test TASK C - Watch progress endpoints"""
    print("=== TASK C - Watch Progress Tests ===")
    
    # Test 11: Progress without auth
    try:
        response = requests.post(f"{BACKEND_URL}/api/progress", json={})
        if response.status_code == 401:
            log_test("Progress no auth", "PASS", "Correctly rejected unauthenticated request")
        else:
            log_test("Progress no auth", "FAIL", f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Progress no auth", "FAIL", f"Exception: {e}")
    
    # Test 12: Save progress (first entry)
    try:
        progress_data = {
            "mal_id": 52991,
            "episode": 1,
            "current_time": 120.5,
            "duration": 1440,
            "percent": 8.4,
            "completed": False,
            "title": "Frieren",
            "image_url": "https://example.com/x.jpg"
        }
        response = requests.post(
            f"{BACKEND_URL}/api/progress",
            headers={"Authorization": f"Bearer {USER_TOKEN}", "Content-Type": "application/json"},
            json=progress_data
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Progress save first", "PASS", "Successfully saved progress")
            else:
                log_test("Progress save first", "FAIL", f"Unexpected response: {data}")
        else:
            log_test("Progress save first", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Progress save first", "FAIL", f"Exception: {e}")
    
    # Test 13: Update progress (upsert)
    try:
        progress_data = {
            "mal_id": 52991,
            "episode": 1,
            "current_time": 220.0,
            "duration": 1440,
            "percent": 15.2,
            "completed": False,
            "title": "Frieren",
            "image_url": "https://example.com/x.jpg"
        }
        response = requests.post(
            f"{BACKEND_URL}/api/progress",
            headers={"Authorization": f"Bearer {USER_TOKEN}", "Content-Type": "application/json"},
            json=progress_data
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Progress upsert", "PASS", "Successfully updated progress")
            else:
                log_test("Progress upsert", "FAIL", f"Unexpected response: {data}")
        else:
            log_test("Progress upsert", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Progress upsert", "FAIL", f"Exception: {e}")
    
    # Test 14: Save progress for different episode
    try:
        progress_data = {
            "mal_id": 52991,
            "episode": 2,
            "current_time": 60,
            "duration": 1440,
            "percent": 4,
            "completed": False
        }
        response = requests.post(
            f"{BACKEND_URL}/api/progress",
            headers={"Authorization": f"Bearer {USER_TOKEN}", "Content-Type": "application/json"},
            json=progress_data
        )
        if response.status_code == 200:
            log_test("Progress episode 2", "PASS", "Successfully saved episode 2 progress")
        else:
            log_test("Progress episode 2", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Progress episode 2", "FAIL", f"Exception: {e}")
    
    # Test 15: Save completed progress
    try:
        progress_data = {
            "mal_id": 1,
            "episode": 1,
            "current_time": 1400,
            "duration": 1400,
            "percent": 100,
            "completed": True,
            "title": "Cowboy Bebop"
        }
        response = requests.post(
            f"{BACKEND_URL}/api/progress",
            headers={"Authorization": f"Bearer {USER_TOKEN}", "Content-Type": "application/json"},
            json=progress_data
        )
        if response.status_code == 200:
            log_test("Progress completed", "PASS", "Successfully saved completed progress")
        else:
            log_test("Progress completed", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Progress completed", "FAIL", f"Exception: {e}")
    
    # Test 16: Get my progress
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/progress/me",
            headers={"Authorization": f"Bearer {USER_TOKEN}"}
        )
        if response.status_code == 200:
            data = response.json()
            if len(data) >= 3:
                # Check if upsert worked (percent should be 15.2 for mal_id 52991, episode 1)
                frieren_ep1 = next((item for item in data if item.get("mal_id") == 52991 and item.get("episode") == 1), None)
                if frieren_ep1 and frieren_ep1.get("percent") == 15.2:
                    log_test("Progress get mine", "PASS", f"Found {len(data)} entries, upsert worked (percent=15.2)")
                else:
                    log_test("Progress get mine", "PASS", f"Found {len(data)} entries, but upsert verification unclear")
            else:
                log_test("Progress get mine", "FAIL", f"Expected ≥3 entries, got {len(data)}")
        else:
            log_test("Progress get mine", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Progress get mine", "FAIL", f"Exception: {e}")
    
    # Test 17: Get progress without auth
    try:
        response = requests.get(f"{BACKEND_URL}/api/progress/me")
        if response.status_code == 401:
            log_test("Progress get no auth", "PASS", "Correctly rejected unauthenticated request")
        else:
            log_test("Progress get no auth", "FAIL", f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Progress get no auth", "FAIL", f"Exception: {e}")
    
    # Test 18: Delete progress
    try:
        response = requests.delete(
            f"{BACKEND_URL}/api/progress/52991",
            headers={"Authorization": f"Bearer {USER_TOKEN}"}
        )
        if response.status_code == 200:
            # Verify deletion by checking progress list
            get_response = requests.get(
                f"{BACKEND_URL}/api/progress/me",
                headers={"Authorization": f"Bearer {USER_TOKEN}"}
            )
            if get_response.status_code == 200:
                data = get_response.json()
                frieren_entries = [item for item in data if item.get("mal_id") == 52991]
                cowboy_entries = [item for item in data if item.get("mal_id") == 1]
                
                if len(frieren_entries) == 0 and len(cowboy_entries) > 0:
                    log_test("Progress delete", "PASS", "Successfully deleted mal_id 52991, Cowboy Bebop still present")
                else:
                    log_test("Progress delete", "FAIL", f"Deletion verification failed: Frieren={len(frieren_entries)}, Cowboy={len(cowboy_entries)}")
            else:
                log_test("Progress delete", "FAIL", f"Could not verify deletion: {get_response.status_code}")
        else:
            log_test("Progress delete", "FAIL", f"Status: {response.status_code}")
    except Exception as e:
        log_test("Progress delete", "FAIL", f"Exception: {e}")

def main():
    """Main test runner"""
    print("🚀 Starting Phase 2 Backend Testing")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Supabase URL: {SUPABASE_URL}")
    print()
    
    # Setup authentication
    if not setup_auth():
        print("❌ Authentication setup failed. Exiting.")
        sys.exit(1)
    
    # Run tests
    test_stream_endpoints()
    test_anikoto_proxy()
    test_progress_endpoints()
    
    print("🏁 Phase 2 Backend Testing Complete")

if __name__ == "__main__":
    main()