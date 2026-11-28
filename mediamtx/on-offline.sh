#!/bin/sh
# on-offline.sh — runOnOffline do path ~^live/ (MediaMTX v1.21).
# Dispara quando o OBS para (ou a publicação cai): encerra a live no app,
# que por sua vez avisa os espectadores via socket (live_ended).
# Idempotente no servidor: chamadas repetidas devolvem alreadyEnded.
set -u

ENV_FILE="/usr/local/etc/mediamtx/live.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3002}"
KEY="${MTX_PATH#live/}"

if [ -z "${MTX_PATH:-}" ] || [ "$KEY" = "$MTX_PATH" ] || [ -z "$KEY" ]; then
  echo "[on-offline] MTX_PATH inesperado: '${MTX_PATH:-<vazio>}'" >&2
  exit 0
fi

if [ -z "${MEDIA_SECRET:-}" ]; then
  echo "[on-offline] MEDIA_SECRET vazio (ver live.env)" >&2
  exit 0
fi

RESP="$(curl -sS -m 10 -X POST "$API_BASE_URL/api/live/publish-done" \
  -H "x-media-server-secret: $MEDIA_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"streamKey\":\"$KEY\"}" 2>/dev/null)"

echo "[on-offline] publish-done key=${KEY%%????*}... resp=$RESP" >&2
exit 0
