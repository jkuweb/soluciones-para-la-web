#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# bootstrap-cliente.sh — Crea un nuevo cliente desde cero
# ============================================================
# Uso:
#   PAYLOAD_ADMIN_EMAIL=admin@agencia.com PAYLOAD_ADMIN_PASS=xxx \
#     ./bootstrap-cliente.sh "Cliente Ejemplo" cliente-ejemplo cliente-ejemplo.com web-estatica
#
# Tipos: web-estatica, tienda-online, academia-online
# ============================================================

if [ $# -lt 3 ]; then
  echo "Uso: PAYLOAD_ADMIN_EMAIL=x PAYLOAD_ADMIN_PASS=y $0 <nombre> <slug> <dominio> [tipo]"
  exit 1
fi

NOMBRE="$1"
SLUG="$2"
DOMINIO="$3"
TIPO="${4:-web-estatica}"
API="${PAYLOAD_API_URL:-http://localhost:3000/api}"

case "$TIPO" in
  web-estatica) FRONTEND="astro" ;;
  tienda-online|academia-online) FRONTEND="nextjs" ;;
  *) echo "Tipo inválido: $TIPO"; exit 1 ;;
esac

echo "=========================================="
echo "  Creando cliente: $NOMBRE"
echo "=========================================="

# Login
EMAIL="${PAYLOAD_ADMIN_EMAIL:-admin@agencia.com}"
PASS="${PAYLOAD_ADMIN_PASS:-}"

if [ -z "$PASS" ]; then
  echo "ERROR: PAYLOAD_ADMIN_PASS no está definida"
  exit 1
fi

echo "[1/5] Login..."
LOGIN=$(curl -s -f "$API/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

TOKEN=$(echo "$LOGIN" | sed 's/.*"token":"\([^"]*\)".*/\1/')
[ -z "$TOKEN" ] && echo "ERROR: Login falló" && exit 1
echo "  ✓ Login exitoso"
AUTH="Authorization: JWT $TOKEN"

# Crear tenant
echo "[2/5] Creando tenant..."
TENANT=$(curl -s -f "$API/tenants" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"name\": \"$NOMBRE\",
    \"slug\": \"$SLUG\",
    \"domain\": \"$DOMINIO\",
    \"serviceType\": \"$TIPO\",
    \"frontendType\": \"$FRONTEND\",
    \"status\": \"active\",
    \"maintenanceFee\": 79,
    \"projectPrice\": 1500,
    \"paymentStatus\": \"initial-paid\"
  }")

TENANT_ID=$(echo "$TENANT" | sed 's/.*"id":\([0-9]*\).*/\1/')
echo "  ✓ Tenant creado (ID: $TENANT_ID)"

# Crear páginas
echo "[3/5] Creando páginas..."

create_page() {
  local PAGE_SLUG=$1
  local PAGE_TITLE=$2
  local PAGE_BLOCKS=$3

  curl -s -f "$API/pages" \
    -H "Content-Type: application/json" \
    -H "$AUTH" \
    -d "{
      \"slug\": \"$PAGE_SLUG\",
      \"title\": \"$PAGE_TITLE\",
      \"tenant\": $TENANT_ID,
      \"status\": \"published\",
      \"layout\": $PAGE_BLOCKS
    }" > /dev/null && echo "  ✓ Página '$PAGE_SLUG' creada"
}

# Helper: generate Lexical JSON for richText
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
lexical_json() {
  node "$SCRIPT_DIR/agencia-backend/scripts/lexical-json.js" "$1"
}

HOME_CONTENT=$(lexical_json "Calidad y tradición desde 1990.")

CTA='{"type":"custom","url":"#contacto","label":"Contáctanos"}'

create_page "home" "Inicio" '[
  {"blockType":"hero","title":"'"$NOMBRE"'","subtitle":"Bienvenido a nuestra web","cta": '"$CTA"'},
  {"blockType":"text","heading":"Sobre nosotros","content": '"$HOME_CONTENT"'},
  {"blockType":"footer","copyright":"© 2026 '"$NOMBRE"'"}
]'

create_page "contacto" "Contacto" '[
  {"blockType":"contact","email":"info@'"$DOMINIO"'","phone":"+34 123 456 789"},
  {"blockType":"footer","copyright":"© 2026 '"$NOMBRE"'"}
]'

if [ "$TIPO" = "web-estatica" ]; then
  create_page "menu" "Menú" '[
    {"blockType":"menu","category":"Platos principales"},
    {"blockType":"footer","copyright":"© 2026 '"$NOMBRE"'"}
  ]'
fi

# Crear usuario cliente
echo "[4/5] Creando usuario del cliente..."
CLIENT_EMAIL="cliente@$DOMINIO"
CLIENT_PASS=$(openssl rand -base64 12)

curl -s -f "$API/users" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"email\": \"$CLIENT_EMAIL\",
    \"password\": \"$CLIENT_PASS\",
    \"name\": \"$NOMBRE (Cliente)\",
    \"roles\": \"tenant-editor\",
    \"tenants\": [{\"tenant\": $TENANT_ID, \"roles\": \"editor\"}]
  }" > /dev/null && echo "  ✓ Usuario creado: $CLIENT_EMAIL / $CLIENT_PASS"

# Scaffold frontend
echo "[5/5] Scaffolding del frontend..."
TEMPLATE="astro-starter"
[ "$FRONTEND" = "nextjs" ] && TEMPLATE="nextjs-starter"
DEST_DIR="../$DOMINIO"

if [ -d "$DEST_DIR" ]; then
  echo "  ⚠ El directorio $DEST_DIR ya existe"
else
  cp -r "$TEMPLATE" "$DEST_DIR"
  cat > "$DEST_DIR/.env" <<ENVEOF
PAYLOAD_API_URL=http://localhost:3000/api
TENANT_SLUG=$SLUG
ENVEOF
  echo "  ✓ Frontend creado en $DEST_DIR"
fi

echo ""
echo "=========================================="
echo "  🎉 Cliente creado!"
echo "=========================================="
echo "  Tenant:      $SLUG"
echo "  Frontend:    $DEST_DIR"
echo "  Cliente:     $CLIENT_EMAIL / $CLIENT_PASS"
echo "=========================================="
