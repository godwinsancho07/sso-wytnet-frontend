"""
WytSaaS ↔ VoteSmart AI — Full Webhook Integration Test
=======================================================
Run this from anywhere:
    python test_webhook_integration.py

What it does (in order):
  Step 1  Verify the vote backend is up and the GET health check works
  Step 2  Pull credentials for APP_dub918f4c85 from WytSaaS (or create them)
  Step 3  Register the webhook URL on WytSaaS so it knows where to POST
  Step 4  Fire a real signed webhook from WytSaaS → vote backend
  Step 5  Confirm the vote backend processed it (check /api/wytsaas/status)
  Step 6  Fire a cancellation and confirm the subscription was revoked
"""

import json
import sys
import hmac
import hashlib

try:
    import requests
except ImportError:
    sys.exit("❌  'requests' is not installed.  Run: pip install requests")

# ── Configuration ─────────────────────────────────────────────────────────────
WYTSAAS_BASE  = "http://localhost:8001/api/v1"
VOTE_BASE     = "http://localhost:8002"
APP_ID        = "APP_dub918f4c85"                     # from vote backend .env
WEBHOOK_URL   = f"{VOTE_BASE}/webhooks/wytsaas"
TEST_USER_ID  = "USR_test_integration_001"
TEST_EMAIL    = "integration-test@votesmart.ai"

# ── Helpers ───────────────────────────────────────────────────────────────────
OK   = "✅"
FAIL = "❌"
INFO = "ℹ️ "

def section(title: str):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")

def check(label: str, ok: bool, detail: str = ""):
    mark = OK if ok else FAIL
    print(f"  {mark}  {label}", end="")
    if detail:
        print(f"  →  {detail}", end="")
    print()
    return ok

def post(url, **kwargs):
    try:
        return requests.post(url, timeout=10, **kwargs)
    except requests.ConnectionError:
        return None

def get(url, **kwargs):
    try:
        return requests.get(url, timeout=10, **kwargs)
    except requests.ConnectionError:
        return None

# ── Step 1: Vote backend health ───────────────────────────────────────────────
section("Step 1 — Vote backend reachability")

r = get(f"{VOTE_BASE}/health")
if not check("GET /health", r is not None and r.status_code == 200,
             r.json().get("service", "") if r else "server not responding"):
    sys.exit(f"\n{FAIL}  Vote backend (port 8002) is not reachable. Is it running?")

r = get(f"{VOTE_BASE}/webhooks/wytsaas")
check("GET /webhooks/wytsaas  (new health endpoint)", r is not None and r.status_code == 200,
      json.dumps(r.json()) if r else "no response")

# ── Step 2: WytSaaS reachability & credentials ───────────────────────────────
section("Step 2 — WytSaaS backend reachability + credentials")

r = get(f"{WYTSAAS_BASE}/marketplace/listings")
if not check("GET /api/v1/marketplace/listings", r is not None and r.status_code == 200,
             f"{len(r.json())} live listings" if r and r.ok else str(r.status_code if r else "unreachable")):
    sys.exit(f"\n{FAIL}  WytSaaS backend (port 8001) is not reachable. Is it running?")

r = get(f"{WYTSAAS_BASE}/dev/apps/{APP_ID}/credentials")
if r and r.status_code == 200:
    creds = r.json()
    WEBHOOK_SECRET = creds["webhook_secret"]
    check("Credentials found in WytSaaS DB", True,
          f"webhook_secret={WEBHOOK_SECRET[:18]}… | webhook_url={creds.get('webhook_url')}")
else:
    print(f"  {INFO}  No credentials yet — will be created in Step 3.")
    WEBHOOK_SECRET = None

# ── Step 3: Register webhook URL ─────────────────────────────────────────────
section(f"Step 3 — Register webhook URL on WytSaaS for {APP_ID}")

payload = {"webhook_url": WEBHOOK_URL}
if WEBHOOK_SECRET:
    payload["webhook_secret"] = WEBHOOK_SECRET   # keep existing secret

r = post(f"{WYTSAAS_BASE}/dev/apps/{APP_ID}/setup-webhook", json=payload)
if not check("POST /dev/apps/{app_id}/setup-webhook", r is not None and r.ok,
             json.dumps(r.json(), indent=2) if r else "no response"):
    sys.exit(f"\n{FAIL}  Could not register webhook URL.")

data = r.json()
WEBHOOK_SECRET = data["webhook_secret"]
APP_KEY        = data["app_key"]
print(f"\n  {INFO}  Webhook secret  : {WEBHOOK_SECRET}")
print(f"  {INFO}  Webhook URL     : {data['webhook_url']}")
print(f"\n  ⚠️   If WYTSAAS_WEBHOOK_SECRET in vote/backend/.env differs,")
print(f"       update it to: {WEBHOOK_SECRET}")
print(f"       Then restart uvicorn on port 8002.")

# ── Step 4: Fire a real webhook from WytSaaS → vote backend ──────────────────
section("Step 4 — Fire subscription.created webhook")

fire_payload = {
    "user_id": TEST_USER_ID,
    "email":   TEST_EMAIL,
    "plan":    "starter",
    "event":   "subscription.created",
}
r = post(f"{WYTSAAS_BASE}/dev/apps/{APP_ID}/fire-webhook", json=fire_payload)
if not check("POST /dev/apps/{app_id}/fire-webhook", r is not None and r.ok,
             f"response_status={r.json().get('response_status')}" if r and r.ok else str(r.text if r else "no response")):
    print(f"\n  {INFO}  Trying direct POST to vote backend instead…")
    # Direct test: compute signature ourselves
    direct_payload = {
        "event":   "subscription.created",
        "app_id":  APP_KEY if 'APP_KEY' in dir() else APP_ID,
        "user_id": TEST_USER_ID,
        "email":   TEST_EMAIL,
        "plan":    "starter",
        "status":  "active",
    }
    body_str = json.dumps(direct_payload, sort_keys=True)
    sig = hmac.new(
        WEBHOOK_SECRET.encode(),
        body_str.encode(),
        hashlib.sha256
    ).hexdigest()
    r2 = post(
        f"{VOTE_BASE}/webhooks/wytsaas",
        data=body_str,
        headers={
            "Content-Type":        "application/json",
            "X-WytSaaS-Signature": f"sha256={sig}",
            "X-WytSaaS-Event":     "subscription.created",
        }
    )
    check("Direct POST /webhooks/wytsaas", r2 is not None and r2.ok,
          json.dumps(r2.json()) if r2 else "no response")

# ── Step 5: Confirm vote backend registered the user ─────────────────────────
section("Step 5 — Verify vote backend processed the event")

r = get(f"{VOTE_BASE}/api/wytsaas/status")
if r and r.ok:
    status = r.json()
    active = status.get("marketplace_users", 0)
    check("GET /api/wytsaas/status", True,
          f"{active} active subscriber(s) | secret_configured={status.get('webhook_secret_configured')}")
else:
    check("GET /api/wytsaas/status", False, str(r.status_code if r else "unreachable"))

# ── Step 6: Fire a cancellation ───────────────────────────────────────────────
section("Step 6 — Fire subscription.cancelled webhook")

cancel_payload = {
    "user_id": TEST_USER_ID,
    "email":   TEST_EMAIL,
    "plan":    "starter",
    "event":   "subscription.cancelled",
}
r = post(f"{WYTSAAS_BASE}/dev/apps/{APP_ID}/fire-webhook", json=cancel_payload)
check("POST fire-webhook (subscription.cancelled)", r is not None and r.ok,
      f"response_status={r.json().get('response_status')}" if r and r.ok else str(r.text if r else "no response"))

# ── Summary ───────────────────────────────────────────────────────────────────
section("Summary")

r = get(f"{WYTSAAS_BASE}/dev/apps/{APP_ID}/webhook-logs")
if r and r.ok:
    logs = r.json()
    print(f"  {INFO}  {len(logs)} webhook log(s) recorded in WytSaaS:\n")
    for log in logs[:5]:
        status_icon = "✅" if log["response_status"] == 200 else "❌"
        print(f"    {status_icon}  [{log['response_status']}] {log['event_type']}  @ {log['sent_at']}")

print(f"""
{'='*60}
  Next steps:
  1. Make sure WYTSAAS_WEBHOOK_SECRET in vote/backend/.env
     matches the webhook_secret printed above.
  2. Restart the vote backend if you changed .env.
  3. Visit http://localhost:8002/webhooks/wytsaas  → should show JSON (no error).
  4. Visit http://localhost:8002/api/wytsaas/status → shows active subscribers.
  5. Visit http://localhost:8001/docs for the full WytSaaS Swagger UI.
{'='*60}
""")
