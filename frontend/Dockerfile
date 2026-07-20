# ==============================================================================
# Roamio — React Frontend
# ==============================================================================
# Multi-stage build:
#   builder  — installs deps and builds the static site with Vite
#   runtime  — serves the static files with nginx
# ==============================================================================

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Accept build-time API URL (can be overridden at build time)
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the static site
RUN npm run build


# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config for SPA routing (all paths → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
