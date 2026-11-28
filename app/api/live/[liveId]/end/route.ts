import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { getLiveCollections } from "@/lib/live/database";
import { isValidObjectId } from "@/lib/live/helpers";
import { LIVE_CONFIG } from "@/lib/live/config";

interface RouteContext {
  params: Promise<{
    liveId: string;
  }>;
}

// POST — Terminar uma transmissão (só o dono; waiting ou live -> ended).
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = verifyToken(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado." },
        { status: 401 }
      );
    }

    const { liveId } = await context.params;

    if (!isValidObjectId(liveId)) {
      return NextResponse.json(
        { success: false, message: "ID da transmissão inválido." },
        { status: 400 }
      );
    }

    const { lives, viewers } = await getLiveCollections();

    const liveObjectId = new ObjectId(liveId);
    const live = await lives.findOne({ _id: liveObjectId });

    if (!live) {
      return NextResponse.json(
        { success: false, message: "Transmissão não encontrada." },
        { status: 404 }
      );
    }

    if (live.streamerId !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Apenas o criador pode terminar esta transmissão.",
        },
        { status: 403 }
      );
    }

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

    // Fecha a live e zera o contador primeiro; viewers são removidos abaixo.
    // Se o processo cair no meio, o leave continua a funcionar (idempotente)
    // e nenhum contador fica negativo.
    const closed = await lives.updateOne(
      {
        _id: liveObjectId,
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
      return NextResponse.json(
        {
          success: false,
          message: "Não foi possível terminar a transmissão. Tenta novamente.",
        },
        { status: 409 }
      );
    }

    await viewers.deleteMany({ liveId: liveObjectId });

    return NextResponse.json({
      success: true,
      alreadyEnded: false,
      message: "A tua Live terminou.",
      live: {
        id: liveId,
        status: LIVE_CONFIG.STATUS.ENDED,
        endedAt: now,
        viewersCount: 0,
      },
    });
  } catch (error) {
    console.error("[LIVE END ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Erro interno ao terminar a Live." },
      { status: 500 }
    );
  }
}
