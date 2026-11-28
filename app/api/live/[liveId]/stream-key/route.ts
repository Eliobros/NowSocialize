import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getLiveCollections } from "@/lib/live/database";
import { verifyToken } from "@/lib/auth";
import { isValidObjectId } from "@/lib/live/helpers";

interface RouteContext {
  params: Promise<{
    liveId: string;
  }>;
}

// GET — Obter a stream key (apenas o dono da live)
export async function GET(request: NextRequest, context: RouteContext) {
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

    const live = await lives.findOne({ _id: new ObjectId(liveId) });

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
          message: "Apenas o criador pode ver a chave desta transmissão.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      streamKey: live.streamKey,
      live: {
        id: liveId,
        title: live.title,
        status: live.status,
      },
    });
  } catch (error) {
    console.error("Erro ao obter stream key:", error);

    return NextResponse.json(
      { success: false, message: "Erro ao obter chave da transmissão." },
      { status: 500 }
    );
  }
}
