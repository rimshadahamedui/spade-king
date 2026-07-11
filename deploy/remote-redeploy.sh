#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/r-spade
PORT=4010

if [ ! -f /tmp/rspade-backend.tgz ]; then
  echo "Missing /tmp/rspade-backend.tgz" >&2
  exit 1
fi

mkdir -p "$APP_DIR"
tar -xzf /tmp/rspade-backend.tgz -C "$APP_DIR" --exclude='./.env'
cd "$APP_DIR"

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Missing $APP_DIR/.env — run remote-setup.sh for first-time install." >&2
  exit 1
fi

npm ci
npm run build

pm2 delete r-spade-api 2>/dev/null || true
pm2 start dist/server.js --name r-spade-api --cwd "$APP_DIR" -i 1 --time
pm2 save

sleep 2
curl -sf "http://127.0.0.1:${PORT}/health"
echo
echo "r-spade-api redeployed on 127.0.0.1:${PORT}"
