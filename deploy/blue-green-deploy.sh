#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/omnia-detect}"
GHCR_OWNER="${GHCR_OWNER:-m9kz}"
GHCR_REPOSITORY="${GHCR_REPOSITORY:-omnia_detect}"
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG is required}"
SERVER_NAME="${SERVER_NAME:-_}"
NGINX_CONF_PATH="${NGINX_CONF_PATH:-/etc/nginx/conf.d/omnia-detect.conf}"
PUBLIC_HTTP_PORT="${PUBLIC_HTTP_PORT:-80}"

COMPOSE_FILE="$DEPLOY_ROOT/deploy/docker-compose.blue-green.yml"
ACTIVE_SLOT_FILE="$DEPLOY_ROOT/active-slot"

mkdir -p "$DEPLOY_ROOT/data" "$DEPLOY_ROOT/ml_models" "$DEPLOY_ROOT/runs"

ACTIVE_SLOT="$(cat "$ACTIVE_SLOT_FILE" 2>/dev/null || echo blue)"
if [ "$ACTIVE_SLOT" = "blue" ]; then
    NEXT_SLOT="green"
    NEXT_PORT="8082"
else
    NEXT_SLOT="blue"
    NEXT_PORT="8081"
fi

export GHCR_OWNER
export GHCR_REPOSITORY
export IMAGE_TAG
export FRONTEND_PORT="$NEXT_PORT"

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

docker compose -p "omnia-$NEXT_SLOT" -f "$COMPOSE_FILE" pull
docker compose -p "omnia-$NEXT_SLOT" -f "$COMPOSE_FILE" up -d --remove-orphans

curl --fail --silent --show-error \
    --retry 20 \
    --retry-delay 3 \
    "http://127.0.0.1:$NEXT_PORT/api/health" >/dev/null

render_nginx_config() {
    local tmp_file
    tmp_file="$(mktemp)"

    cat > "$tmp_file" <<NGINX
server {
    listen ${PUBLIC_HTTP_PORT};
    server_name ${SERVER_NAME};
    client_max_body_size 200m;

    location / {
        proxy_pass http://127.0.0.1:${NEXT_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

    if command -v sudo >/dev/null 2>&1; then
        sudo cp "$tmp_file" "$NGINX_CONF_PATH"
        sudo nginx -t
        if command -v systemctl >/dev/null 2>&1; then
            sudo systemctl reload nginx
        else
            sudo nginx -s reload
        fi
    else
        cp "$tmp_file" "$NGINX_CONF_PATH"
        nginx -t
        nginx -s reload
    fi

    rm -f "$tmp_file"
}

if [ "${SKIP_NGINX_RELOAD:-false}" != "true" ]; then
    render_nginx_config
fi

echo "$NEXT_SLOT" > "$ACTIVE_SLOT_FILE"

docker compose -p "omnia-$ACTIVE_SLOT" -f "$COMPOSE_FILE" down || true
docker image prune -f >/dev/null || true

echo "Deployed $IMAGE_TAG to $NEXT_SLOT on port $NEXT_PORT"
