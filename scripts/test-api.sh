#!/usr/bin/env bash
# =============================================================================
# Integrity Solve — Deep API Mutation Test Suite
# Usage: bash scripts/test-api.sh
# =============================================================================

BASE="http://localhost:3000/api"
EMAIL="testadmin2@integritysolver.com"
PASS="TestPass1234!"
COOKIE_JAR="/tmp/is_test_cookies.txt"
PASS_COUNT=0
FAIL_COUNT=0
FAIL_MSGS=()

# Clean cookie jar
rm -f "$COOKIE_JAR"

# ─── Helpers ──────────────────────────────────────────────────────────────────

section() { printf "\n%-60s\n" "─────────────────────────────────────────────────────────" ; echo "  $1" ; printf "%-60s\n" "─────────────────────────────────────────────────────────" ; }
pass()    { PASS_COUNT=$((PASS_COUNT+1)); echo "  ✓ $1"; }
fail()    { FAIL_COUNT=$((FAIL_COUNT+1)); FAIL_MSGS+=("  ✗ $1  ↳ $2"); echo "  ✗ $1  ↳ $2"; }

# Returns HTTP status code; body goes to stdout
call() {
  local METHOD="$1" PATH="$2" DATA="$3"
  if [[ -n "$DATA" ]]; then
    curl -s -o /tmp/is_body.json -w "%{http_code}" \
      -X "$METHOD" "$BASE$PATH" \
      -H "Content-Type: application/json" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -d "$DATA"
  else
    curl -s -o /tmp/is_body.json -w "%{http_code}" \
      -X "$METHOD" "$BASE$PATH" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR"
  fi
}

body() { cat /tmp/is_body.json 2>/dev/null; }
jget() { body | python3 -c "import sys,json; d=json.load(sys.stdin); print(d$1)" 2>/dev/null || echo ""; }

assert_status() {
  local LABEL="$1" EXPECTED="$2" ACTUAL="$3"
  if [[ "$ACTUAL" == "$EXPECTED" || ("$EXPECTED" == "2xx" && "$ACTUAL" -ge 200 && "$ACTUAL" -lt 300) ]]; then
    pass "$LABEL (HTTP $ACTUAL)"
  else
    fail "$LABEL" "expected $EXPECTED got $ACTUAL — $(body | head -c 200)"
  fi
}

# ─── 0. SEED & AUTH ───────────────────────────────────────────────────────────

section "0. SEED & AUTH"

# Login
STATUS=$(call POST "/auth/login" '{"email":"'"$EMAIL"'","password":"'"$PASS"'"}')
assert_status "POST /auth/login" "2xx" "$STATUS"

# Me
STATUS=$(call GET "/auth/me")
assert_status "GET /auth/me" "2xx" "$STATUS"

# Seed (POST, requires auth+workspace)
STATUS=$(call POST "/seed" '{}')
assert_status "POST /seed" "2xx" "$STATUS"

# Update profile
STATUS=$(call PATCH "/auth/profile" '{"fullName":"Test Admin API"}')
assert_status "PATCH /auth/profile" "2xx" "$STATUS"

# Change password and revert
STATUS=$(call POST "/auth/change-password" '{"currentPassword":"'"$PASS"'","newPassword":"TestPass5678!"}')
assert_status "POST /auth/change-password" "2xx" "$STATUS"

STATUS=$(call POST "/auth/change-password" '{"currentPassword":"TestPass5678!","newPassword":"'"$PASS"'"}')
assert_status "POST /auth/change-password (revert)" "2xx" "$STATUS"

# ─── 1. CUSTOMERS ─────────────────────────────────────────────────────────────

section "1. CUSTOMERS"

# List
STATUS=$(call GET "/customers")
assert_status "GET /customers" "2xx" "$STATUS"
ITEMS=$(jget "['data']['items']" 2>/dev/null | head -c 5)
[[ -n "$ITEMS" ]] && pass "GET /customers returns items" || fail "GET /customers response shape" "$(body | head -c 150)"

# Create
TS=$(date +%s)
STATUS=$(call POST "/customers" '{"entityType":"INDIVIDUAL","givenNames":"API","familyName":"TestCustomer","email":"apitest'"$TS"'@example.com","riskRating":"MEDIUM","kycStatus":"PENDING"}')
assert_status "POST /customers" "2xx" "$STATUS"
CUSTOMER_ID=$(jget "['data']['id']")
[[ -n "$CUSTOMER_ID" && "$CUSTOMER_ID" != "None" ]] && pass "POST /customers → got ID: $CUSTOMER_ID" || fail "POST /customers ID extraction" "$(body | head -c 200)"

# Get
if [[ -n "$CUSTOMER_ID" && "$CUSTOMER_ID" != "None" ]]; then
  STATUS=$(call GET "/customers/$CUSTOMER_ID")
  assert_status "GET /customers/:id" "2xx" "$STATUS"

  # Update
  STATUS=$(call PATCH "/customers/$CUSTOMER_ID" '{"givenNames":"API Updated"}')
  assert_status "PATCH /customers/:id" "2xx" "$STATUS"

  # Risk rating
  TOMORROW=$(date -d "+90 days" +%Y-%m-%d 2>/dev/null || date -v+90d +%Y-%m-%d 2>/dev/null || echo "2026-12-01")
  STATUS=$(call PATCH "/customers/$CUSTOMER_ID/risk-rating" '{"riskRating":"HIGH","reason":"API test risk update","reviewDate":"'"$TOMORROW"'"}')
  assert_status "PATCH /customers/:id/risk-rating" "2xx" "$STATUS"

  # Status change
  STATUS=$(call PATCH "/customers/$CUSTOMER_ID/status" '{"status":"ACTIVE","reason":"Verified via API test"}')
  assert_status "PATCH /customers/:id/status" "2xx" "$STATUS"

  # Beneficial owner
  STATUS=$(call POST "/customers/$CUSTOMER_ID/beneficial-owners" '{"fullName":"Jane API Test","ownershipPercent":35,"dateOfBirth":"1975-06-15","countryOfResidence":"AU","isPep":false}')
  assert_status "POST /customers/:id/beneficial-owners" "2xx" "$STATUS"
fi

# ─── 2. CHECKS ────────────────────────────────────────────────────────────────

section "2. CHECKS"

if [[ -n "$CUSTOMER_ID" && "$CUSTOMER_ID" != "None" ]]; then
  STATUS=$(call POST "/checks/run" '{"customerId":"'"$CUSTOMER_ID"'","checkType":"IDENTITY","provider":"MANUAL","notes":"API test check"}')
  assert_status "POST /checks/run" "2xx" "$STATUS"
  CHECK_ID=$(jget "['data']['id']")

  STATUS=$(call GET "/checks?customerId=$CUSTOMER_ID")
  assert_status "GET /checks?customerId=" "2xx" "$STATUS"

  if [[ -n "$CHECK_ID" && "$CHECK_ID" != "None" ]]; then
    STATUS=$(call GET "/checks/$CHECK_ID")
    assert_status "GET /checks/:id" "2xx" "$STATUS"

    STATUS=$(call POST "/checks/$CHECK_ID/override" '{"outcome":"PASS","justification":"API test override"}')
    assert_status "POST /checks/:id/override" "2xx" "$STATUS"
  fi
else
  fail "Checks section skipped" "no customer ID"
fi

# ─── 3. PROGRAMS ──────────────────────────────────────────────────────────────

section "3. PROGRAMS"

STATUS=$(call GET "/programs")
assert_status "GET /programs" "2xx" "$STATUS"

STATUS=$(call POST "/programs" '{"title":"API Test AML/CTF Program","pathway":"ACCOUNTING"}')
assert_status "POST /programs" "2xx" "$STATUS"
PROGRAM_ID=$(jget "['data']['id']")
[[ -n "$PROGRAM_ID" && "$PROGRAM_ID" != "None" ]] && pass "POST /programs → got ID: $PROGRAM_ID" || fail "POST /programs ID extraction" "$(body | head -c 200)"

if [[ -n "$PROGRAM_ID" && "$PROGRAM_ID" != "None" ]]; then
  STATUS=$(call GET "/programs/$PROGRAM_ID")
  assert_status "GET /programs/:id" "2xx" "$STATUS"

  # Save step 0 — Business Profile
  STATUS=$(call PATCH "/programs/$PROGRAM_ID/step" '{"step":0,"data":{"legalName":"API Test Pty Ltd","abn":"12345678901","industryPathway":"ACCOUNTING","businessDescription":"API test company"},"reason":"API test business profile"}')
  assert_status "PATCH /programs/:id/step (step 0)" "2xx" "$STATUS"

  # Save step 1 — Designated Services
  STATUS=$(call PATCH "/programs/$PROGRAM_ID/step" '{"step":1,"data":{"designatedServices":["Cash dealing services","Bookkeeping services"]},"reason":"API test designated services"}')
  assert_status "PATCH /programs/:id/step (step 1)" "2xx" "$STATUS"

  # Save step 2 — Risk Assessment
  STATUS=$(call PATCH "/programs/$PROGRAM_ID/step" '{"step":2,"data":{"inherentRiskRating":"MEDIUM","residualRiskRating":"LOW","customerRisk":"LOW","geographicRisk":"LOW","riskMitigants":"Strong CDD controls"},"reason":"API test risk assessment"}')
  assert_status "PATCH /programs/:id/step (step 2)" "2xx" "$STATUS"
fi

# ─── 4. ESCALATIONS ───────────────────────────────────────────────────────────

section "4. ESCALATIONS"

STATUS=$(call GET "/escalations")
assert_status "GET /escalations" "2xx" "$STATUS"

if [[ -n "$CUSTOMER_ID" && "$CUSTOMER_ID" != "None" ]]; then
  ESC_DATA='{"customerId":"'"$CUSTOMER_ID"'","title":"API Test Escalation","description":"Suspicious transactions detected during API testing","severity":"MEDIUM","category":"TRANSACTION_MONITORING"}'
else
  ESC_DATA='{"title":"API Test Escalation (no customer)","description":"Suspicious activity detected","severity":"MEDIUM","category":"TRANSACTION_MONITORING"}'
fi

STATUS=$(call POST "/escalations" "$ESC_DATA")
assert_status "POST /escalations" "2xx" "$STATUS"
ESC_ID=$(jget "['data']['id']")
[[ -n "$ESC_ID" && "$ESC_ID" != "None" ]] && pass "POST /escalations → got ID: $ESC_ID" || fail "POST /escalations ID extraction" "$(body | head -c 200)"

if [[ -n "$ESC_ID" && "$ESC_ID" != "None" ]]; then
  STATUS=$(call GET "/escalations/$ESC_ID")
  assert_status "GET /escalations/:id" "2xx" "$STATUS"

  STATUS=$(call PATCH "/escalations/$ESC_ID" '{"notes":"Updated via API test"}')
  assert_status "PATCH /escalations/:id" "2xx" "$STATUS"

  STATUS=$(call POST "/escalations/$ESC_ID/escalate" '{"reason":"Escalating to senior compliance officer"}')
  assert_status "POST /escalations/:id/escalate" "2xx" "$STATUS"

  # Create SMR
  STATUS=$(call POST "/escalations/$ESC_ID/smr" '{"suspiciousBehavior":"Multiple cash transactions just below $10,000 threshold over 3 days","reportingObligation":"SMR","austracCategory":"STRUCTURING","lodgementReason":"API test SMR","transactionIds":[]}')
  assert_status "POST /escalations/:id/smr" "2xx" "$STATUS"
  SMR_ID=$(jget "['data']['id']")

  if [[ -n "$SMR_ID" && "$SMR_ID" != "None" ]]; then
    pass "POST /escalations SMR → got ID: $SMR_ID"

    STATUS=$(call POST "/escalations/$ESC_ID/smr/$SMR_ID/approve" '{"reason":"Approved via API test"}')
    assert_status "POST /escalations/:id/smr/:smrId/approve" "2xx" "$STATUS"

    STATUS=$(call POST "/escalations/$ESC_ID/smr/$SMR_ID/submit" '{"reason":"Submitted to AUSTRAC via API test"}')
    assert_status "POST /escalations/:id/smr/:smrId/submit" "2xx" "$STATUS"
  else
    fail "SMR ID extraction" "$(body | head -c 200)"
  fi
fi

# ─── 5. TASKS ─────────────────────────────────────────────────────────────────

section "5. TASKS"

STATUS=$(call GET "/tasks")
assert_status "GET /tasks" "2xx" "$STATUS"

DUE=$(date -d "+14 days" +%Y-%m-%d 2>/dev/null || date -v+14d +%Y-%m-%d 2>/dev/null || echo "2026-12-01")
STATUS=$(call POST "/tasks" '{"title":"API Test Task","description":"Test task from API suite","priority":"HIGH","dueDate":"'"$DUE"'"}')
assert_status "POST /tasks" "2xx" "$STATUS"
TASK_ID=$(jget "['data']['id']")

if [[ -n "$TASK_ID" && "$TASK_ID" != "None" ]]; then
  pass "POST /tasks → got ID: $TASK_ID"
  STATUS=$(call PATCH "/tasks/$TASK_ID" '{"status":"IN_PROGRESS","priority":"CRITICAL"}')
  assert_status "PATCH /tasks/:id" "2xx" "$STATUS"
fi

# ─── 6. ALERTS ────────────────────────────────────────────────────────────────

section "6. ALERTS"

STATUS=$(call GET "/alerts")
assert_status "GET /alerts" "2xx" "$STATUS"

ALERT_DATA='{"title":"API Test Alert","description":"Automated alert from API test suite","severity":"HIGH","category":"TRANSACTION_MONITORING"}'
[[ -n "$CUSTOMER_ID" && "$CUSTOMER_ID" != "None" ]] && ALERT_DATA='{"title":"API Test Alert","description":"Automated alert from API test suite","severity":"HIGH","category":"TRANSACTION_MONITORING","customerId":"'"$CUSTOMER_ID"'"}'

STATUS=$(call POST "/alerts" "$ALERT_DATA")
assert_status "POST /alerts" "2xx" "$STATUS"
ALERT_ID=$(jget "['data']['id']")

if [[ -n "$ALERT_ID" && "$ALERT_ID" != "None" ]]; then
  pass "POST /alerts → got ID: $ALERT_ID"
  STATUS=$(call POST "/alerts/$ALERT_ID/acknowledge" '{}')
  assert_status "POST /alerts/:id/acknowledge" "2xx" "$STATUS"

  STATUS=$(call POST "/alerts/$ALERT_ID/resolve" '{"resolution":"Investigated — no suspicious activity confirmed"}')
  assert_status "POST /alerts/:id/resolve" "2xx" "$STATUS"
fi

# ─── 7. TRAINING ──────────────────────────────────────────────────────────────

section "7. TRAINING"

STATUS=$(call GET "/training")
assert_status "GET /training" "2xx" "$STATUS"

STATUS=$(call POST "/training" '{"moduleName":"API Test AML/CTF Module","moduleVersion":"1.0","status":"COMPLETED","score":92,"completedAt":"2026-01-15","expiresAt":"2027-01-15","certificationNumber":"CERT-API-001"}')
assert_status "POST /training" "2xx" "$STATUS"
TRAINING_ID=$(jget "['data']['id']")

if [[ -n "$TRAINING_ID" && "$TRAINING_ID" != "None" ]]; then
  pass "POST /training → got ID: $TRAINING_ID"
  STATUS=$(call PATCH "/training/$TRAINING_ID" '{"score":95,"status":"COMPLETED"}')
  assert_status "PATCH /training/:id" "2xx" "$STATUS"
fi

# ─── 8. REVIEWS ───────────────────────────────────────────────────────────────

section "8. REVIEWS"

STATUS=$(call GET "/reviews")
assert_status "GET /reviews" "2xx" "$STATUS"

DUE30=$(date -d "+30 days" +%Y-%m-%d 2>/dev/null || date -v+30d +%Y-%m-%d 2>/dev/null || echo "2026-12-01")
REVIEW_DATA='{"reviewType":"PERIODIC","title":"API Test Annual Review","dueDate":"'"$DUE30"'"}'
[[ -n "$CUSTOMER_ID" && "$CUSTOMER_ID" != "None" ]] && REVIEW_DATA='{"reviewType":"PERIODIC","title":"API Test Annual Review","dueDate":"'"$DUE30"'","customerId":"'"$CUSTOMER_ID"'"}'

STATUS=$(call POST "/reviews" "$REVIEW_DATA")
assert_status "POST /reviews" "2xx" "$STATUS"
REVIEW_ID=$(jget "['data']['id']")

if [[ -n "$REVIEW_ID" && "$REVIEW_ID" != "None" ]]; then
  pass "POST /reviews → got ID: $REVIEW_ID"

  STATUS=$(call POST "/reviews/$REVIEW_ID/start" '{}')
  assert_status "POST /reviews/:id/start" "2xx" "$STATUS"

  DUE365=$(date -d "+365 days" +%Y-%m-%d 2>/dev/null || date -v+365d +%Y-%m-%d 2>/dev/null || echo "2027-05-01")
  STATUS=$(call POST "/reviews/$REVIEW_ID/complete" '{"outcome":"SATISFACTORY","findings":"No critical findings. Minor CDD improvements recommended.","nextReviewDate":"'"$DUE365"'"}')
  assert_status "POST /reviews/:id/complete" "2xx" "$STATUS"
fi

# ─── 9. NOTIFICATIONS ─────────────────────────────────────────────────────────

section "9. NOTIFICATIONS"

STATUS=$(call GET "/notifications")
assert_status "GET /notifications" "2xx" "$STATUS"

STATUS=$(call POST "/notifications/read-all" '{}')
assert_status "POST /notifications/read-all" "2xx" "$STATUS"

# ─── 10. WORKSPACE ────────────────────────────────────────────────────────────

section "10. WORKSPACE"

STATUS=$(call GET "/workspaces/current")
assert_status "GET /workspaces/current" "2xx" "$STATUS"

STATUS=$(call PATCH "/workspaces/current" '{"legalName":"API Test Workspace"}')
assert_status "PATCH /workspaces/current" "2xx" "$STATUS"

STATUS=$(call GET "/workspaces/members")
assert_status "GET /workspaces/members" "2xx" "$STATUS"

# ─── 11. AUDIT LOG ────────────────────────────────────────────────────────────

section "11. AUDIT LOG"

STATUS=$(call GET "/audit")
assert_status "GET /audit" "2xx" "$STATUS"
ITEMS_AUDIT=$(jget "['data']['items']" 2>/dev/null | head -c 5)
[[ -n "$ITEMS_AUDIT" ]] && pass "GET /audit returns items" || fail "GET /audit shape" "$(body | head -c 150)"

STATUS=$(call GET "/audit?limit=5")
assert_status "GET /audit?limit=5" "2xx" "$STATUS"

# ─── 12. ANALYTICS ────────────────────────────────────────────────────────────

section "12. ANALYTICS"

for EP in "/analytics/smr" "/analytics/training" "/analytics/reviews" "/analytics/dashboard"; do
  STATUS=$(call GET "$EP")
  [[ "$STATUS" -ge 200 && "$STATUS" -lt 300 ]] \
    && assert_status "GET $EP" "2xx" "$STATUS" \
    || echo "  ⚠  GET $EP → HTTP $STATUS (may not exist)"
done

# ─── 13. DOCUMENTS ────────────────────────────────────────────────────────────

section "13. DOCUMENTS"

STATUS=$(call GET "/documents")
assert_status "GET /documents" "2xx" "$STATUS"

# ─── SUMMARY ──────────────────────────────────────────────────────────────────

TOTAL=$((PASS_COUNT + FAIL_COUNT))
printf "\n\n"
printf "╔════════════════════════════════════════════════════════════╗\n"
printf "║  RESULTS: %d/%d passed, %d failed%-28s║\n" "$PASS_COUNT" "$TOTAL" "$FAIL_COUNT" ""
printf "╚════════════════════════════════════════════════════════════╝\n"

if [[ ${#FAIL_MSGS[@]} -gt 0 ]]; then
  printf "\n  Failed tests:\n"
  for msg in "${FAIL_MSGS[@]}"; do echo "$msg"; done
fi

[[ "$FAIL_COUNT" -eq 0 ]] && exit 0 || exit 1
