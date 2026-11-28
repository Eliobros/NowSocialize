import { NextRequest, NextResponse } from "next/server";

import { getLiveCollections } from "@/lib/live/database";
import { LIVE_CONFIG } from "@/lib/live/config";
import {
  getMediaSecret,
  extractMediaSecret,
  isValidMediaSecret,
} from "@/lib/live/media-auth";
import { emitLiveEnded } from "@/lib/socket-relay";

// POST — Webhook interno (on_publish_done): o servidor de mídia avisa que a
// publicação terminou (OBS fechado, queda de conexão). Encerra a live e
// notifica os espectadores via Socket em tempo real. Idempotente.
export async function POST(request: NextRequest) {
  try {
    const expectedSecret = getMediaSecret();

    // Fail closed: sem segredo configurado, ninguém encerra nada.
    if (!expectedSecret) {
      return NextResponse.json(
        { success: false, message: "Validação interna não configurada." },
        { status: 500 }
      );
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Corpo da requisição inválido." },
        { status: 400 }
      );
    }

    const providedSecret = extractMediaSecret(request, body.secret);

    if (!isValidMediaSecret(providedSecret, expectedSecret)) {
      return NextResponse.json(
        { success: false, message: "Segredo inválido." },
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
        { success: false, message: "Stream key inválida." },
        { status: 400 }
      );
    }

    const { lives, viewers } = await getLiveCollections();

    const live = await lives.findOne(
      { streamKey },
      { projection: { streamKey: 0 } }
    );

    if (!live) {
      return NextResponse.json(
        { success: false, message: "Stream key desconhecida." },
        { status: 404 }
      );
    }

    const liveId = live._id?.toString() ?? "";

    if (live.status === LIVE_CONFIG.STATUS.ENDED) {
      return NextResponse.json({
        success: true,
        alreadyEnded: true,
        message: "Esta Live já tinha terminado.",
        live: {
          id: liveId,
          status: live.status,
          endedAt: live.endedAt,
          viewersCount: 0,
        },
      });
    }

    const now = new Date();

    const closed = await lives.updateOne(
      {
        _id: live._id,
        status: {
          $in: [LIVE_CONFIG.STATUS.WAITING, LIVE_CONFIG.STATUS.LIVE],
        },
      },
      {
        $set: {
          status: LIVE_CONFIG.STATUS.ENDED,
          endedAt: now,
          viewersCount: 0,
        },
      }
    );

    if (closed.modifiedCount !== 1) {
      // Perdeu a corrida (ex: o dono encerrou pelo app no mesmo instante).
      const current = await lives.findOne({ _id: live._id });

      if (current?.status === LIVE_CONFIG.STATUS.ENDED) {
        return NextResponse.json({
          success: true,
          alreadyEnded: true,
          message: "Esta Live já tinha terminado.",
          live: {
            id: liveId,
            status: current.status,
            endedAt: current.endedAt,
            viewersCount: 0,
          },
        });
      }

      return NextResponse.json(
        { success: false, message: "Não foi possível encerrar a Live." },
        { status: 409 }
      );
    }

    await viewers.deleteMany({ liveId: live._id });

    // Best-effort: avisa a sala mesmo que o socket esteja fora do ar,
    // a resposta não depende dele.
    await emitLiveEnded(liveId, now.toISOString());

    return NextResponse.json({
      success: true,
      alreadyEnded: false,
      message: "Live encerrada pelo servidor de mídia.",
      live: {
        id: liveId,
        status: LIVE_CONFIG.STATUS.ENDED,
        endedAt: now,
        viewersCount: 0,
      },
    });
  } catch (error) {
    console.error("[LIVE PUBLISH-DONE ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Erro interno ao encerrar a Live." },
      { status: 500 }
    );
  }
}
