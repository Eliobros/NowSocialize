import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { getLiveCollections, ensureLiveIndexes } from "@/lib/live/database";

// Segredo partilhado com o servidor de mídia. Aceita um segredo dedicado
// (MEDIA_SERVER_SECRET) com fallback para os segredos já existentes.
function getExpectedSecret(): string | null {
  return (
    process.env.MEDIA_SERVER_SECRET ||
    process.env.SOCKET_RELAY_SECRET ||
    process.env.JWT_SECRET ||
    null
  );
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

// POST — Validação interna: o servidor de mídia pergunta se uma streamKey é válida.
// Semântica de webhook (ex: on_publish): 2xx AUTORIZA a publicação,
// qualquer outro status RECUSA.
export async function POST(request: NextRequest) {
  try {
    const expectedSecret = getExpectedSecret();

    // Fail closed: sem segredo configurado, ninguém valida nada.
    if (!expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: "Validação interna não configurada.",
        },
        { status: 500 }
      );
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: "Corpo da requisição inválido.",
        },
        { status: 400 }
      );
    }

    // Cabeçalho primário; body.secret existe porque alguns servidores de mídia
    // (ex: nginx-rtmp on_publish) não permitem cabeçalhos personalizados.
    const providedSecret: unknown =
      request.headers.get("x-media-secret") ?? body.secret;

    if (
      typeof providedSecret !== "string" ||
      !secretsMatch(providedSecret, expectedSecret)
    ) {
      return NextResponse.json(
        { success: false, valid: false, message: "Segredo inválido." },
        { status: 401 }
      );
    }

    const streamKey: unknown = body.streamKey;

    if (
      typeof streamKey !== "string" ||
      streamKey.length < 1 ||
      streamKey.length > 128
    ) {
      return NextResponse.json(
        { success: false, valid: false, message: "Stream key inválida." },
        { status: 400 }
      );
    }

    await ensureLiveIndexes();

    const { lives } = await getLiveCollections();

    const live = await lives.findOne(
      { streamKey },
      { projection: { streamKey: 0 } }
    );

    if (!live) {
      return NextResponse.json(
        { success: false, valid: false, message: "Stream key desconhecida." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      live: {
        id: live._id?.toString(),
        status: live.status,
        title: live.title,
        streamerId: live.streamerId,
        streamerName: live.streamerName,
      },
    });
  } catch (error) {
    console.error("[LIVE VALIDATE-KEY ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        valid: false,
        message: "Erro interno ao validar stream key.",
      },
      { status: 500 }
    );
  }
}
