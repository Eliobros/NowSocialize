#!/bin/sh
# on-online.sh — runOnOnline do path ~^live/ (MediaMTX v1.21).
# 1) Valida a streamKey (extraída de $MTX_PATH=live/<streamKey>) no validate-key
#    e obtém o liveId público correspondente.
# 2) Faz ponte ffmpeg (só repasse, sem re-encode): live/<key> -> public/<liveId>,
#    para a streamKey NUNCA aparecer na URL HLS dos espectadores.
# O MediaMTX manda SIGINT neste processo quando a live sai do ar (runOnOffline),
# por isso usamos `exec`: o sinal chega direto ao ffmpeg. Com runOnOnlineRestart,
# se o ffmpeg morrer por erro transitório, o MediaMTX arranca a ponte de novo.
set -u

ENV_FILE="/usr/local/etc/mediamtx/live.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3002}"
KEY="${MTX_PATH#live/}"

if [ -z "${MTX_PATH:-}" ] || [ "$KEY" = "$MTX_PATH" ] || [ -z "$KEY" ]; then
  echo "[on-online] MTX_PATH inesperado: '${MTX_PATH:-<vazio>}'" >&2
  exit 1
fi

if [ -z "${MEDIA_SECRET:-}" ]; then
  echo "[on-online] MEDIA_SECRET vazio (ver live.env)" >&2
  exit 1
fi

RESP="$(curl -sS -m 10 -X POST "$API_BASE_URL/api/live/validate-key" \
  -H "x-media-server-secret: $MEDIA_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"streamKey\":\"$KEY\"}" 2>/dev/null)"
HTTP="$?"

LIVE_ID="$(printf '%s' "$RESP" | sed -n 's/.*"liveId":"\([a-f0-9]*\)".*/\1/p' | head -n 1)"

case "$LIVE_ID" in
 ????????????????????????)
    # 24 hex chars: parece um ObjectId válido, segue.
    ;;
  *)
    echo "[on-online] validate-key recusou ou falhou (curl=$HTTP) key=${KEY%%????*}... liveId='${LIVE_ID}'" >&2
    exit 1
    ;;
esac

# A publicação original já foi autorizada pelo auth HTTP; aqui só repassamos.
# Leitura e publicação da ponte usam a credencial bridge (exigida pelo mtmx-auth).
BRIDGE_USER="${MTMX_BRIDGE_USER:-bridge}"
IN="rtmp://${BRIDGE_USER}:${MTMX_BRIDGE_PASS:-}@127.0.0.1:1935/live/$KEY"
OUT="rtmp://${BRIDGE_USER}:${MTMX_BRIDGE_PASS:-}@127.0.0.1:1935/public/$LIVE_ID"

echo "[on-online] ponte live/<redacted> -> public/$LIVE_ID" >&2
exec ffmpeg -hide_banner -loglevel warning -i "$IN" -c copy -f flv "$OUT"
