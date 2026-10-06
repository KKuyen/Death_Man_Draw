# syntax=docker/dockerfile:1
# Targets: `server` (Colyseus game server) and `web` (Caddy serving the built web app + reverse proxy).
# Build from the repo root:  docker build -f infra/Dockerfile --target server .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages packages
# --ignore-scripts: skip the Electron binary download; not needed for web/server builds
RUN npm ci --ignore-scripts
COPY apps apps
COPY public public
COPY scripts/bundle-server.mjs scripts/
# Public WebSocket/HTTP endpoint the browser uses to reach the server (baked into the web bundle by Vite).
ARG VITE_SERVER_URL=
ENV VITE_SERVER_URL=$VITE_SERVER_URL
# Default Node heap sizing guesses low on memory-constrained build hosts (e.g. small cloud VMs) and OOMs mid-build; raise the ceiling explicitly.
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN npm run build -w @saloon/web && node scripts/bundle-server.mjs

FROM node:22-alpine AS server
ENV NODE_ENV=production HOST=0.0.0.0 PORT=2567 DATA_DIR=/data
WORKDIR /app
COPY --from=build /app/dist-bundle/server.mjs ./server.mjs
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 2567
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]

FROM caddy:2-alpine AS web
COPY --from=build /app/apps/web/dist /srv
COPY infra/Caddyfile /etc/caddy/Caddyfile
