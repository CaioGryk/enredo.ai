#!/bin/bash
# Enredo.ai — Local Runtime Readiness Check
# =============================================================================
# Purpose: Verify local development environment is ready for mobile/web preview.
#
# This script is NON-DESTRUCTIVE. It does NOT:
#   - Run migrations or db push
#   - Modify database data
#   - Modify any files
#   - Expose secrets
#
# It MAY run:
#   - Safe TCP host/port reachability tests
#   - Read-only PrismaClient SELECT 1 via check:prisma-connect
#   - HTTP health endpoint checks
#   - TypeScript/Prisma schema validation
#
# Usage:
#   bash scripts/check-local-ready.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
WARN=0
FAIL=0

pass() { echo -e "  ${GREEN}✅ $1${NC}"; PASS=$((PASS + 1)); }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; WARN=$((WARN + 1)); }
fail() { echo -e "  ${RED}❌ $1${NC}"; FAIL=$((FAIL + 1)); }

API_DIR="$(cd "$(dirname "$0")/.." && pwd)/services/api"
MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)/apps/mobile"
API_URL="${API_URL:-http://localhost:3001}"
HEALTH_URL="${HEALTH_URL:-${API_URL}/api/health}"

echo ""
echo "═══════════════════════════════════════════"
echo "  Enredo.ai — Local Runtime Readiness Check"
echo "═══════════════════════════════════════════"
echo ""

# ── 1. Environment variables ──────────────────────────────────────
echo "── 1. Environment Variables ──"

ENV_FILE="$API_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  pass ".env file exists"
else
  fail ".env file NOT found at $ENV_FILE"
  echo "       Copy .env.example to .env and fill in your credentials."
fi

# Check critical vars (presence only, never print values)
check_env() {
  local key="$1"
  local label="$2"
  local file="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    local val=$(grep "^${key}=" "$file" | cut -d'=' -f2-)
    if [ -z "$val" ] || [ "$val" = "" ]; then
      warn "$label is set but empty"
    else
      pass "$label is configured"
    fi
  else
    warn "$label is NOT configured"
  fi
}

check_env "DATABASE_URL" "DATABASE_URL" "$ENV_FILE"
check_env "DIRECT_URL" "DIRECT_URL" "$ENV_FILE"
check_env "JWT_SECRET" "JWT_SECRET" "$ENV_FILE"
check_env "REFRESH_TOKEN_SECRET" "REFRESH_TOKEN_SECRET" "$ENV_FILE"
check_env "GROQ_API_KEY" "GROQ_API_KEY" "$ENV_FILE"
check_env "OPENROUTER_API_KEY" "OPENROUTER_API_KEY" "$ENV_FILE"

# ── 1b. DB connectivity diagnostics (safe, never prints secrets) ───
echo ""
echo "── 1b. Database Connectivity ──"

parse_db_url() {
  local url="$1"
  # Extract host and port only — never print user, password, or db name
  local host=$(echo "$url" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  local port=$(echo "$url" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  if [ -z "$host" ]; then host="unknown"; fi
  if [ -z "$port" ]; then port="unknown"; fi
  echo "$host:$port"
}

if [ -f "$ENV_FILE" ]; then
  DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2-)
  if [ -n "$DB_URL" ]; then
    DB_HOST_PORT=$(parse_db_url "$DB_URL")
    echo "  DATABASE_URL → $DB_HOST_PORT"

    DB_HOST=$(echo "$DB_HOST_PORT" | cut -d':' -f1)
    DB_PORT=$(echo "$DB_HOST_PORT" | cut -d':' -f2)

    # Check sslmode
    if echo "$DB_URL" | grep -q "sslmode=require"; then
      pass "DATABASE_URL includes sslmode=require"
    else
      warn "DATABASE_URL does NOT include sslmode=require — may cause P1001 on some networks"
      echo "       If Prisma fails with P1001, add ?sslmode=require to DATABASE_URL"
    fi

    # Check if it looks like Supabase pooler (port 6543) or direct (port 5432)
    if [ "$DB_PORT" = "6543" ]; then
      echo "    → Supabase transaction pooler (pgBouncer)"
    elif [ "$DB_PORT" = "5432" ]; then
      echo "    → Direct PostgreSQL connection"
    else
      warn "Unexpected DB port: $DB_PORT"
    fi

    # TCP reachability test with nc
    if command -v nc &> /dev/null; then
      if nc -z -w 3 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        pass "Database host $DB_HOST:$DB_PORT is reachable (TCP)"
      else
        fail "Cannot reach $DB_HOST:$DB_PORT (TCP) — P1001 likely"
        echo ""
        echo "  Likely causes of P1001:"
        echo "    - Supabase project is paused (free tier hibernates after inactivity)"
        echo "    - Wrong pooler host/port in DATABASE_URL"
        echo "    - IPv6/DNS issue — try DIRECT_URL instead"
        echo "    - Local network/VPN/firewall blocking port $DB_PORT"
        echo "    - Stale/rotated Supabase database password"
        echo "    - pgBouncer connection limit exhausted"
        echo ""
        echo "  Recovery steps:"
        echo "    1. Visit https://supabase.com/dashboard and check project status"
        echo "    2. Go to Project Settings → Database → Connection info"
        echo "    3. Copy the Pooler connection string to DATABASE_URL"
        echo "    4. Copy the Direct connection string to DIRECT_URL"
        echo "    5. Verify your IP is in the project's network allowlist"
        echo "    6. If using DIRECT_URL, ensure Prisma CLI uses --direct-url flag"
      fi
    else
      warn "nc not available — cannot test TCP reachability"
    fi
  fi
fi

# Also check DIRECT_URL
if [ -f "$ENV_FILE" ]; then
  DIRECT_URL_RAW=$(grep "^DIRECT_URL=" "$ENV_FILE" | cut -d'=' -f2-)
  if [ -n "$DIRECT_URL_RAW" ]; then
    DIRECT_HOST_PORT=$(parse_db_url "$DIRECT_URL_RAW")
    echo "  DIRECT_URL → $DIRECT_HOST_PORT"

    DIRECT_HOST=$(echo "$DIRECT_HOST_PORT" | cut -d':' -f1)
    DIRECT_PORT=$(echo "$DIRECT_HOST_PORT" | cut -d':' -f2)

    if [ "$DIRECT_PORT" = "6543" ]; then
      warn "DIRECT_URL uses pooler port 6543 — should use port 5432 or the direct DB host"
      echo "       Consider using Supabase Session Pooler (port 5432) or direct connection"
    fi
  fi
fi

echo ""

# ── 1c. Prisma read-only connectivity ─────────────────────────────
echo "── 1c. Prisma Client Connectivity (SELECT 1) ──"

cd "$API_DIR"
if npm run check:prisma-connect > /dev/null 2>&1; then
  pass "PrismaClient can connect and query (read-only SELECT 1)"
else
  fail "PrismaClient cannot connect using current DATABASE_URL"
  echo ""
  echo "  TCP reachability alone is not sufficient — PrismaClient connection"
  echo "  also depends on correct password, pgBouncer mode, SSL, and pooler config."
  echo ""
  echo "  The catalog:beta:hide-legacy script requires the same connection path."
  echo "  Fix the connection before running any DB-dependent commands."
fi

echo ""

# ── 2. Prerequisites ──────────────────────────────────────────────
echo "── 2. Prerequisites ──"

cd "$API_DIR"
if npx prisma validate > /dev/null 2>&1; then
  pass "Prisma schema is valid"
else
  fail "Prisma schema validation failed"
fi

if npx tsc --noEmit --incremental false > /dev/null 2>&1; then
  pass "Backend TypeScript is clean"
else
  fail "Backend TypeScript has errors"
fi

# ── 3. Backend Connectivity ───────────────────────────────────────
echo ""
echo "── 3. Backend Connectivity ──"

HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
  HEALTH_BODY=$(curl -s "$HEALTH_URL" 2>/dev/null)
  DB_STATUS=$(echo "$HEALTH_BODY" | grep -o '"database":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

  pass "Backend is running on $API_URL"

  if [ "$DB_STATUS" = "ok" ]; then
    pass "Database is connected"
  else
    fail "Backend is running but database status is: $DB_STATUS"
    echo ""
    echo "  database !== ok blocks provider-real QA and real-user testing."
    echo "  Check Supabase project status and DATABASE_URL configuration."
  fi
else
  warn "Backend is NOT running on $API_URL (HTTP $HEALTH_RESPONSE)"
  echo ""
  echo "  To start the backend:"
  echo "    cd services/api"
  echo "    npm run dev"
  echo ""
  echo "  If startup fails with Prisma P1001 error:"
  echo "    - The Supabase pooler at DATABASE_URL is unreachable."
  echo "    - P1001 blocks backend startup — the API cannot serve requests."
  echo "    - Check Supabase project status (not paused), IP allowlist, and network."
  echo "    - Verify DATABASE_URL in .env matches your Supabase pooler URI."
fi

echo ""

# ── 4. Mobile Preview ─────────────────────────────────────────────
echo "── 4. Mobile/Web Preview ──"

cd "$MOBILE_DIR"
if npx tsc --noEmit --incremental false > /dev/null 2>&1; then
  pass "Mobile TypeScript is clean"
else
  fail "Mobile TypeScript has errors"
fi

echo ""

# ── Summary ───────────────────────────────────────────────────────
echo "═══════════════════════════════════════════"
TOTAL=$((PASS + WARN + FAIL))
echo "  Results: $PASS passed, $WARN warnings, $FAIL failed ($TOTAL checks)"
echo "═══════════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  ❌ Some critical checks failed. Review the items above."
  exit 1
elif [ $WARN -gt 0 ]; then
  echo ""
  echo "  ⚠️  Warnings found — environment may need attention."
  exit 0
else
  echo ""
  echo "  ✅ All checks passed. Local environment is ready."
  exit 0
fi
