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

// GET — Histórico recente do chat (para quem chega no meio da live)
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
        { success: false, message: "ID da Live inválido." },
        { status: 400 }
      );
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);

    const { lives, messages } = await getLiveCollections();

    const live = await lives.findOne(
      { _id: new ObjectId(liveId) },
      { projection: { _id: 1 } }
    );

    if (!live) {
      return NextResponse.json(
        { success: false, message: "Live não encontrada." },
        { status: 404 }
      );
    }

    const history = await messages
      .find({ liveId: new ObjectId(liveId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      messages: history.reverse().map((msg) => ({
        id: msg._id?.toString(),
        userId: msg.userId,
        username: msg.username,
        avatar: msg.avatar ?? null,
        message: msg.message,
        createdAt:
          msg.createdAt instanceof Date
            ? msg.createdAt.toISOString()
            : msg.createdAt,
      })),
    });
  } catch (error) {
    console.error("[LIVE MESSAGES ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Erro ao carregar mensagens." },
      { status: 500 }
    );
  }
}
