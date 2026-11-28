import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Segredo partilhado com o servidor de mídia. Aceita um segredo dedicado
// (MEDIA_SERVER_SECRET) com fallback para os segredos já existentes.
export function getMediaSecret(): string | null {
  return (
    process.env.MEDIA_SERVER_SECRET ||
    process.env.SOCKET_RELAY_SECRET ||
    process.env.JWT_SECRET ||
    null
  );
}

// Cabeçalhos aceites, por ordem. x-media-server-secret é o primário,
// x-media-secret é um alias histórico.
export function extractMediaSecret(
  request: NextRequest,
  bodySecret: unknown
): unknown {
  return (
    request.headers.get("x-media-server-secret") ??
    request.headers.get("x-media-secret") ??
    bodySecret
  );
}

export function isValidMediaSecret(
  provided: unknown,
  expected: string
): boolean {
  if (typeof provided !== "string" || provided.length === 0) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
