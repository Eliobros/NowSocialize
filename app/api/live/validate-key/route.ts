import { NextRequest, NextResponse } from "next/server";

import { ensureLiveIndexes } from "@/lib/live/database";
import { LIVE_CONFIG } from "@/lib/live/config";
import {
  getMediaSecret,
  extractMediaSecret,
  isValidMediaSecret,
} from "@/lib/live/media-auth";
import { authorizePublishByKey } from "@/lib/live/publish-gate";

// POST — Validação interna (on_publish): o servidor de mídia pergunta se uma
// streamKey é válida. Semântica de webhook: 2xx AUTORIZA a publicação,
// qualquer outro status RECUSA.
// Efeito colateral: chave válida com live em waiting inicia a live
// automaticamente (o POST /start manual continua como fallback).
export async function POST(request: NextRequest) {
  try {
    const expectedSecret = getMediaSecret();

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

    // body.secret existe porque alguns servidores de mídia
    // (ex: nginx-rtmp on_publish) não permitem cabeçalhos personalizados.
    const providedSecret = extractMediaSecret(request, body.secret);

    if (!isValidMediaSecret(providedSecret, expectedSecret)) {
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

    const gate = await authorizePublishByKey(streamKey);

    if (!gate.allowed) {
      if (gate.reason === "ended") {
        return NextResponse.json(
          { success: false, valid: false, message: "Esta Live já terminou." },
          { status: 409 }
        );
      }

      if (gate.reason === "race") {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            message: "Tenta novamente.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, valid: false, message: "Stream key desconhecida." },
        { status: 404 }
      );
    }

    // Contrato OBS <-> HLS (o servidor de mídia faz o mapeamento interno):
    // - Publicação (secreta): rtmp://<midia>/live/{streamKey} (vem do OBS)
    // - Reprodução (pública): https://<midia>/public/{liveId}/index.m3u8 (vai ao browser)
    // A streamKey NUNCA aparece na URL de reprodução; o liveId top-level
    // existe para o servidor de mídia montar o path público sem parsear o objeto.
    const liveId = gate.liveId as string;

    return NextResponse.json({
      success: true,
      valid: true,
      autoStarted: gate.autoStarted,
      liveId,
      live: {
        id: liveId,
        status: LIVE_CONFIG.STATUS.LIVE,
        title: gate.title,
        streamerId: gate.streamerId,
        streamerName: gate.streamerName,
        startedAt: gate.startedAt,
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
