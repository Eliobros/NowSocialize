import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { getLiveCollections } from "@/lib/live/database";
import { isValidObjectId } from "@/lib/live/helpers";

interface RouteContext {
  params: Promise<{
    liveId: string;
  }>;
}

// POST — Sair de uma transmissão (idempotente, sem transações).
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
        { success: false, message: "ID da Live inválido." },
        { status: 400 }
      );
    }

    if (!isValidObjectId(user.userId)) {
      return NextResponse.json(
        { success: false, message: "ID de utilizador inválido." },
        { status: 400 }
      );
    }

    const { lives, viewers } = await getLiveCollections();

    const liveObjectId = new ObjectId(liveId);
    const live = await lives.findOne({ _id: liveObjectId });

    if (!live) {
      return NextResponse.json(
        { success: false, message: "Live não encontrada." },
        { status: 404 }
      );
    }

    const removed = await viewers.deleteOne({
      liveId: liveObjectId,
      userId: user.userId,
    });

    // Idempotente: sair duas vezes (ou sair sem ter entrado) não derruba o contador.
    if (removed.deletedCount !== 1) {
      return NextResponse.json({
        success: true,
        alreadyLeft: true,
        message: "Já não estavas nesta Live.",
        viewersCount: live.viewersCount,
      });
    }

    await lives.updateOne(
      { _id: liveObjectId, viewersCount: { $gt: 0 } },
      { $inc: { viewersCount: -1 } }
    );

    const updatedLive = await lives.findOne({ _id: liveObjectId });

    return NextResponse.json({
      success: true,
      alreadyLeft: false,
      message: "Saíste da Live.",
      viewersCount: updatedLive?.viewersCount ?? 0,
    });
  } catch (error) {
    console.error("[LIVE LEAVE ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Erro interno ao sair da Live." },
      { status: 500 }
    );
  }
}
