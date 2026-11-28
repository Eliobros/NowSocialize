import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { getLiveCollections, ensureLiveIndexes } from "@/lib/live/database";
import { isValidObjectId } from "@/lib/live/helpers";
import { LIVE_CONFIG } from "@/lib/live/config";
import { emitLiveViewers } from "@/lib/socket-relay";

interface RouteContext {
  params: Promise<{
    liveId: string;
  }>;
}

// POST — Entrar numa transmissão (sem transações: funciona em Mongo standalone).
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

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Corpo da requisição inválido." },
        { status: 400 }
      );
    }

    const socketId = body.socketId;

    if (
      typeof socketId !== "string" ||
      socketId.length < 1 ||
      socketId.length > 100
    ) {
      return NextResponse.json(
        { success: false, message: "Socket ID inválido." },
        { status: 400 }
      );
    }

    await ensureLiveIndexes();

    const { lives, viewers } = await getLiveCollections();

    const liveObjectId = new ObjectId(liveId);
    const now = new Date();

    const live = await lives.findOne({ _id: liveObjectId });

    if (!live) {
      return NextResponse.json(
        { success: false, message: "Live não encontrada." },
        { status: 404 }
      );
    }

    if (live.status !== LIVE_CONFIG.STATUS.LIVE) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta Live ainda não começou ou já terminou.",
        },
        { status: 409 }
      );
    }

    // 1) Inserir primeiro: o índice único { liveId, userId } resolve a corrida
    // entre dois joins do mesmo utilizador sem mexer no contador.
    try {
      await viewers.insertOne({
        liveId: liveObjectId,
        userId: user.userId,
        username: user.name,
        avatar: user.avatar ?? null,
        socketId,
        joinedAt: now,
      });
    } catch (error: any) {
      // 11000 = duplicate key: já estava na live, só atualiza a conexão.
      if (error?.code === 11000) {
        await viewers.updateOne(
          { liveId: liveObjectId, userId: user.userId },
          {
            $set: {
              socketId,
              joinedAt: now,
              username: user.name,
              avatar: user.avatar ?? null,
            },
          }
        );

        const current = await lives.findOne({ _id: liveObjectId });

        return NextResponse.json({
          success: true,
          alreadyJoined: true,
          message: "Já estavas nesta Live.",
          viewersCount: current?.viewersCount ?? 0,
          maxViewers: current?.maxViewers ?? LIVE_CONFIG.MAX_VIEWERS,
        });
      }

      throw error;
    }

    // 2) Reservar a vaga atomicamente (só entra se ainda houver lugar
    // e a live continuar no ar).
    const capacity = await lives.updateOne(
      {
        _id: liveObjectId,
        status: LIVE_CONFIG.STATUS.LIVE,
        $expr: { $lt: ["$viewersCount", "$maxViewers"] },
      },
      { $inc: { viewersCount: 1 } }
    );

    if (capacity.modifiedCount === 1) {
      const updatedLive = await lives.findOne({ _id: liveObjectId });
      const viewersCount = updatedLive?.viewersCount ?? 0;

      await emitLiveViewers(liveId, viewersCount);

      return NextResponse.json({
        success: true,
        alreadyJoined: false,
        message: "Entraste na Live com sucesso!",
        viewersCount,
        maxViewers: updatedLive?.maxViewers ?? LIVE_CONFIG.MAX_VIEWERS,
      });
    }

    // Sem vaga (live cheia ou terminou no entretanto): desfaz o insert
    // e devolve o motivo real.
    await viewers.deleteOne({ liveId: liveObjectId, userId: user.userId });

    const current = await lives.findOne({ _id: liveObjectId });

    if (!current) {
      return NextResponse.json(
        { success: false, message: "Live não encontrada." },
        { status: 404 }
      );
    }

    if (current.status !== LIVE_CONFIG.STATUS.LIVE) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta Live ainda não começou ou já terminou.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Esta Live está cheia." },
      { status: 409 }
    );
  } catch (error) {
    console.error("[LIVE JOIN ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Erro interno ao entrar na Live." },
      { status: 500 }
    );
  }
}
