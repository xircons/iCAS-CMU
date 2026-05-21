#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — run: cp .env.example .env and edit values"
  exit 1
fi

echo "==> docker compose up -d"
docker compose --env-file .env up -d --build

echo "==> waiting for backend health"
for i in $(seq 1 60); do
  if docker inspect --format='{{.State.Health.Status}}' icas-backend 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 2
done

echo "==> frontend /health"
curl -fsS http://127.0.0.1:3001/health

echo "==> API /api/health"
curl -fsS http://127.0.0.1:3001/api/health

echo "==> compose ps"
docker compose ps

echo "Smoke checks passed. Test login and WebSocket in the browser at http://127.0.0.1:3001"
echo "Note: Secure cookies require HTTPS in production (NODE_ENV=production)."
