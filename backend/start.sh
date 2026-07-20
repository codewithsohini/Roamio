#!/bin/sh
set -e

echo ">>> Running database migrations..."
alembic upgrade head

echo ">>> Starting Roamio FastAPI backend on port ${PORT:-8080}..."

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8080}" \
    --workers "${WORKERS:-2}" \
    --log-level info
