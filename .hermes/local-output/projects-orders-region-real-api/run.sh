#!/usr/bin/env bash
set -euo pipefail

ROOT=/root/nexus-mail
TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/.hermes/local-output/projects-orders-region-real-api/$TS"
mkdir -p "$OUT_DIR"

API_BASE="http://127.0.0.1:8080/api/v1"
HEALTH_URL="http://127.0.0.1:8080/healthz"
FRONT_BASE="http://127.0.0.1:5173"
USER_EMAIL="frontslice.$TS@example.com"
USER_PASSWORD='UserPass123!'
SUPPLIER_EMAIL='supplier@nexus-mail.local'
SUPPLIER_PASSWORD='Supplier123!'
ADMIN_EMAIL='admin@nexus-mail.local'
ADMIN_PASSWORD='Admin123!'

pretty_json() {
  python3 - "$1" <<'PY'
import json,sys
path=sys.argv[1]
with open(path,'r',encoding='utf-8') as f:
    data=json.load(f)
print(json.dumps(data, ensure_ascii=False, indent=2))
PY
}

request() {
  local name="$1"
  local method="$2"
  local url="$3"
  local body="${4:-}"
  local auth="${5:-}"
  local out="$OUT_DIR/${name}.json"
  local code
  if [[ -n "$body" && -n "$auth" ]]; then
    code=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "$url" -H 'Content-Type: application/json' -H "Authorization: Bearer $auth" --data "$body")
  elif [[ -n "$body" ]]; then
    code=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "$url" -H 'Content-Type: application/json' --data "$body")
  elif [[ -n "$auth" ]]; then
    code=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "$url" -H "Authorization: Bearer $auth")
  else
    code=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "$url")
  fi
  printf '%s' "$code" > "$OUT_DIR/${name}.status"
  echo "$code"
}

require_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "[$label] expected HTTP $expected but got $actual" >&2
    [[ -f "$OUT_DIR/${label}.json" ]] && cat "$OUT_DIR/${label}.json" >&2
    exit 1
  fi
}

extract_token() {
  python3 - "$1" <<'PY'
import json,sys
with open(sys.argv[1],'r',encoding='utf-8') as f:
    data=json.load(f)
print(data.get('token') or data.get('access_token') or '')
PY
}

assert_menu_has() {
  local file="$1"
  shift
  python3 - "$file" "$@" <<'PY'
import json,sys
with open(sys.argv[1],'r',encoding='utf-8') as f:
    data=json.load(f)
items=data.get('items', [])
paths={item.get('path') for item in items}
missing=[p for p in sys.argv[2:] if p not in paths]
if missing:
    raise SystemExit(f"missing menu paths: {missing}")
PY
}

assert_menu_lacks() {
  local file="$1"
  shift
  python3 - "$file" "$@" <<'PY'
import json,sys
with open(sys.argv[1],'r',encoding='utf-8') as f:
    data=json.load(f)
items=data.get('items', [])
paths={item.get('path') for item in items}
forbidden=[p for p in sys.argv[2:] if p in paths]
if forbidden:
    raise SystemExit(f"forbidden menu paths present: {forbidden}")
PY
}

assert_inventory_nonempty() {
  python3 - "$1" <<'PY'
import json,sys
with open(sys.argv[1],'r',encoding='utf-8') as f:
    data=json.load(f)
items=data.get('items', [])
if not items:
    raise SystemExit('inventory empty')
PY
}

assert_orders_shape() {
  python3 - "$1" <<'PY'
import json,sys
with open(sys.argv[1],'r',encoding='utf-8') as f:
    data=json.load(f)
items=data.get('items')
if items is None:
    items=[]
if not isinstance(items, list):
    raise SystemExit('orders items not list')
print(len(items))
PY
}

health_code=$(request health GET "$HEALTH_URL")
require_status "$health_code" 200 health
python3 - "$OUT_DIR/health.json" <<'PY'
import json,sys
with open(sys.argv[1],'r',encoding='utf-8') as f:
    data=json.load(f)
assert data.get('status') == 'ok', data
PY

invalid_email_code=$(request register_invalid_email POST "$API_BASE/auth/register" '{"email":"bad-email","password":"UserPass123!","confirm_password":"UserPass123!"}')
require_status "$invalid_email_code" 400 register_invalid_email
short_pw_code=$(request register_short_password POST "$API_BASE/auth/register" '{"email":"short@example.com","password":"1234567","confirm_password":"1234567"}')
require_status "$short_pw_code" 400 register_short_password

register_body=$(python3 - <<PY
import json
print(json.dumps({"email":"$USER_EMAIL","password":"$USER_PASSWORD","confirm_password":"$USER_PASSWORD"}, ensure_ascii=False))
PY
)
register_code=$(request register_user POST "$API_BASE/auth/register" "$register_body")
require_status "$register_code" 201 register_user
USER_TOKEN=$(extract_token "$OUT_DIR/register_user.json")
[[ -n "$USER_TOKEN" ]] || { echo 'missing user token' >&2; exit 1; }

me_code=$(request user_me GET "$API_BASE/auth/me" '' "$USER_TOKEN")
require_status "$me_code" 200 user_me
menu_code=$(request user_menu GET "$API_BASE/auth/menu" '' "$USER_TOKEN")
require_status "$menu_code" 200 user_menu
assert_menu_has "$OUT_DIR/user_menu.json" / /projects /orders /api-keys /webhooks /docs /balance
assert_menu_lacks "$OUT_DIR/user_menu.json" /admin/risk /admin/pricing /supplier/offerings /supplier/resources

dashboard_code=$(request user_dashboard GET "$API_BASE/dashboard/overview" '' "$USER_TOKEN")
require_status "$dashboard_code" 200 user_dashboard
projects_code=$(request user_projects GET "$API_BASE/projects/inventory" '' "$USER_TOKEN")
require_status "$projects_code" 200 user_projects
assert_inventory_nonempty "$OUT_DIR/user_projects.json"
orders_code=$(request user_orders GET "$API_BASE/orders/activations" '' "$USER_TOKEN")
require_status "$orders_code" 200 user_orders
assert_orders_shape "$OUT_DIR/user_orders.json"
api_keys_code=$(request user_api_keys GET "$API_BASE/auth/api-keys" '' "$USER_TOKEN")
require_status "$api_keys_code" 200 user_api_keys
webhooks_code=$(request user_webhooks GET "$API_BASE/webhooks/endpoints" '' "$USER_TOKEN")
require_status "$webhooks_code" 200 user_webhooks

supplier_login_body=$(python3 - <<PY
import json
print(json.dumps({"email":"$SUPPLIER_EMAIL","password":"$SUPPLIER_PASSWORD"}, ensure_ascii=False))
PY
)
supplier_login_code=$(request supplier_login POST "$API_BASE/auth/login" "$supplier_login_body")
require_status "$supplier_login_code" 200 supplier_login
SUPPLIER_TOKEN=$(extract_token "$OUT_DIR/supplier_login.json")
[[ -n "$SUPPLIER_TOKEN" ]] || { echo 'missing supplier token' >&2; exit 1; }
supplier_menu_code=$(request supplier_menu GET "$API_BASE/auth/menu" '' "$SUPPLIER_TOKEN")
require_status "$supplier_menu_code" 200 supplier_menu
assert_menu_has "$OUT_DIR/supplier_menu.json" /supplier/resources /supplier/offerings /supplier/settlements /api-keys /webhooks /docs
supplier_resources_code=$(request supplier_resources GET "$API_BASE/supplier/resources/overview" '' "$SUPPLIER_TOKEN")
require_status "$supplier_resources_code" 200 supplier_resources
supplier_offerings_code=$(request supplier_offerings GET "$API_BASE/supplier/resources/offerings" '' "$SUPPLIER_TOKEN")
require_status "$supplier_offerings_code" 200 supplier_offerings
supplier_settlements_code=$(request supplier_settlements GET "$API_BASE/supplier/settlements" '' "$SUPPLIER_TOKEN")
require_status "$supplier_settlements_code" 200 supplier_settlements

admin_login_body=$(python3 - <<PY
import json
print(json.dumps({"email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD"}, ensure_ascii=False))
PY
)
admin_login_code=$(request admin_login POST "$API_BASE/auth/login" "$admin_login_body")
require_status "$admin_login_code" 200 admin_login
ADMIN_TOKEN=$(extract_token "$OUT_DIR/admin_login.json")
[[ -n "$ADMIN_TOKEN" ]] || { echo 'missing admin token' >&2; exit 1; }
admin_menu_code=$(request admin_menu GET "$API_BASE/auth/menu" '' "$ADMIN_TOKEN")
require_status "$admin_menu_code" 200 admin_menu
assert_menu_has "$OUT_DIR/admin_menu.json" /admin/users /admin/risk /admin/audit /admin/pricing /api-keys /webhooks /docs
admin_overview_code=$(request admin_overview GET "$API_BASE/admin/overview" '' "$ADMIN_TOKEN")
require_status "$admin_overview_code" 200 admin_overview
admin_audit_code=$(request admin_audit GET "$API_BASE/admin/audit?limit=5" '' "$ADMIN_TOKEN")
require_status "$admin_audit_code" 200 admin_audit

for route in / /login /projects /orders /api-keys /webhooks /docs; do
  name=$(echo "$route" | sed 's#[/ ]#_#g; s#^_$#root#')
  code=$(curl -sS -o "$OUT_DIR/frontend_${name}.html" -w '%{http_code}' "$FRONT_BASE$route")
  printf '%s' "$code" > "$OUT_DIR/frontend_${name}.status"
  if [[ "$code" != "200" ]]; then
    echo "frontend route $route failed with $code" >&2
    exit 1
  fi
done

summary="$OUT_DIR/summary.txt"
{
  echo "health: $(cat "$OUT_DIR/health.status")"
  echo "register_invalid_email: $(cat "$OUT_DIR/register_invalid_email.status")"
  echo "register_short_password: $(cat "$OUT_DIR/register_short_password.status")"
  echo "register_user: $(cat "$OUT_DIR/register_user.status")"
  echo "user_menu_paths_ok"
  echo "user_dashboard: $(cat "$OUT_DIR/user_dashboard.status")"
  echo "user_projects: $(cat "$OUT_DIR/user_projects.status")"
  echo "user_orders: $(cat "$OUT_DIR/user_orders.status")"
  echo "user_api_keys: $(cat "$OUT_DIR/user_api_keys.status")"
  echo "user_webhooks: $(cat "$OUT_DIR/user_webhooks.status")"
  echo "supplier_resources: $(cat "$OUT_DIR/supplier_resources.status")"
  echo "supplier_offerings: $(cat "$OUT_DIR/supplier_offerings.status")"
  echo "supplier_settlements: $(cat "$OUT_DIR/supplier_settlements.status")"
  echo "admin_overview: $(cat "$OUT_DIR/admin_overview.status")"
  echo "admin_audit: $(cat "$OUT_DIR/admin_audit.status")"
  echo "frontend_routes_ok"
  echo "output_dir: $OUT_DIR"
} > "$summary"

cat "$summary"
