import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getLiveCollections } from "@/lib/live/database";
import { verifyToken } from "@/lib/auth";
import { isValidObjectId } from "@/lib/live/helpers";
import { LIVE_CONFIG } from "@/lib/live/config";

interface RouteContext {
  params: Promise<{
    liveId: string;
  }>;
}

// POST — Iniciar uma transmissão (waiting -> live, só o dono)
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

    const { lives } = await getLiveCollections();

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
          message: "Apenas o criador pode iniciar esta transmissão.",
        },
        { status: 403 }
      );
    }

    if (live.status === LIVE_CONFIG.STATUS.LIVE) {
      return NextResponse.json({
        success: true,
        alreadyLive: true,
        message: "A tua Live já está no ar.",
        live: {
          id: liveId,
          status: live.status,
          startedAt: live.startedAt,
          viewersCount: live.viewersCount,
        },
      });
    }

    if (live.status === LIVE_CONFIG.STATUS.ENDED) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta Live já terminou. Cria uma nova transmissão.",
        },
        { status: 409 }
      );
    }

    // Transição atômica waiting -> live (protege contra duplo clique / retry).
    const now = new Date();
    const updated = await lives.updateOne(
      { _id: liveObjectId, status: LIVE_CONFIG.STATUS.WAITING },
      {
        $set: {
          status: LIVE_CONFIG.STATUS.LIVE,
          startedAt: now,
        },
      }
    );

    if (updated.modifiedCount !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Não foi possível iniciar a transmissão. Tenta novamente.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyLive: false,
      message: "A tua Live começou!",
      live: {
        id: liveId,
        status: LIVE_CONFIG.STATUS.LIVE,
        startedAt: now,
        viewersCount: live.viewersCount,
      },
    });
  } catch (error) {
    console.error("Erro ao iniciar Live:", error);

    return NextResponse.json(
      { success: false, message: "Erro ao iniciar transmissão." },
      { status: 500 }
    );
  }
}
