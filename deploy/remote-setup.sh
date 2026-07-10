#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/r-spade
PORT=4010

mkdir -p "$APP_DIR"
tar -xzf /tmp/rspade-backend.tgz -C "$APP_DIR"
cd "$APP_DIR"

if [ ! -f /tmp/r-spade.env ]; then
  echo "Missing /tmp/r-spade.env" >&2
  exit 1
fi

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH=$(openssl rand -hex 32)

grep -v '^JWT_SECRET=' /tmp/r-spade.env | grep -v '^JWT_REFRESH_SECRET=' > "$APP_DIR/.env"
{
  echo "JWT_SECRET=${JWT_SECRET}"
  echo "JWT_REFRESH_SECRET=${JWT_REFRESH}"
} >> "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
rm -f /tmp/r-spade.env

npm ci
npm run build

pm2 delete r-spade-api 2>/dev/null || true
pm2 start dist/server.js --name r-spade-api --cwd "$APP_DIR" -i 1 --time
pm2 save

sleep 2
curl -sf "http://127.0.0.1:${PORT}/health"
echo
echo "r-spade-api running on 127.0.0.1:${PORT}"
