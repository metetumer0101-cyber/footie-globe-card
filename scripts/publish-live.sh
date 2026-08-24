#!/usr/bin/env bash
# Publish FootCard as the team's LIVE site on port 3000.
#
# The team's one public surface is port 3000 (reverse-proxied to the published
# URL). This script builds the FootCard app (nitro node-server preset -> .output/)
# and serves it there with the app's own production server.
#
#   Usage: bash scripts/publish-live.sh
#   Logs:  /tmp/footcard-server.log
#
# Re-running is safe: it takes over port 3000 no matter who currently owns it
# (needs sudo, which all team members have).
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

export BUN_INSTALL_CACHE_DIR="${BUN_INSTALL_CACHE_DIR:-/var/fc-buncache}"
LIVE_PORT=3000

# The /home filesystem is small and can't hold this app's node_modules (~400MB),
# so keep deps on the larger overlay fs via a symlink. node_modules is gitignored,
# so re-creating the symlink here never dirties the working tree.
if [ ! -e node_modules ] || [ -L node_modules ]; then
  sudo mkdir -p /var/fc-deps/node_modules
  test -L node_modules || ln -sfn /var/fc-deps/node_modules node_modules
fi

bun install
bun run build   # emits .output/ (nitro node-server preset: static + SSR handler)

# Free LIVE_PORT regardless of which user owns the current listener.
sudo sh -c 'lsof -t -iTCP:3000 -sTCP:LISTEN | xargs -r kill' 2>/dev/null || true
for _ in $(seq 1 25); do
  if ! sudo sh -c 'lsof -t -iTCP:3000 -sTCP:LISTEN' >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

# Bind to all interfaces so the public proxy can reach us; run detached so the
# server survives this script (and this shell) exiting.
setsid nohup env NITRO_HOST=0.0.0.0 NITRO_PORT=$LIVE_PORT \
  node .output/server/index.mjs > /tmp/footcard-server.log 2>&1 < /dev/null &

# Wait for the new server to actually answer before reporting success.
for _ in $(seq 1 50); do
  if curl -sf -o /dev/null "http://localhost:$LIVE_PORT"; then
    echo "FootCard is LIVE on port $LIVE_PORT"
    exit 0
  fi
  sleep 0.2
done
echo "warning: FootCard not responding - check /tmp/footcard-server.log" >&2
exit 1
