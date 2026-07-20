# ==============================================================================
# Roamio — FastAPI Backend
# ==============================================================================
# Multi-stage build:
#   builder  — installs Python dependencies into a virtual environment
#   runtime  — lean image with only the venv + app code
# ==============================================================================

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# System deps needed to compile psycopg2-binary and cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Install into an isolated venv so the runtime stage stays clean
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Minimal runtime system dep (libpq for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN addgroup --system roamio && adduser --system --ingroup roamio roamio

# Bring in the pre-built venv
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy application source
COPY alembic.ini .
COPY alembic/ ./alembic/
COPY app/ ./app/

RUN chown -R roamio:roamio /app
USER roamio

# Port the app listens on (override with -e PORT=…)
ENV PORT=8080
EXPOSE 8080

# Run Alembic migrations then start Uvicorn.
# Use a shell so we can chain commands; exec ensures Uvicorn gets signals.
CMD alembic upgrade head && \
    exec uvicorn app.main:app \
        --host 0.0.0.0 \
        --port "${PORT}" \
        --workers 2 \
        --log-level info
