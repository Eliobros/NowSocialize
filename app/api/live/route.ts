import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getLiveCollections, ensureLiveIndexes } from "@/lib/live/database";
import { verifyToken } from "@/lib/auth";
import {
generateStreamKey,
sanitizeLiveTitle,
sanitizeLiveDescription,
} from "@/lib/live/helpers";
import { LIVE_CONFIG } from "@/lib/live/config";

// POST — Criar uma nova transmissão
export async function POST(request: NextRequest) {
try {
const user = verifyToken(request);

if (!user) {
  return NextResponse.json(
    { success: false, message: "Não autorizado." },
    { status: 401 }
  );
}

const body = await request.json();

const title = sanitizeLiveTitle(body.title);
const description = sanitizeLiveDescription(body.description);

if (!title) {
  return NextResponse.json(
    {
      success: false,
      message: "O título deve ter entre 3 e 100 caracteres.",
    },
    { status: 400 }
  );
}

if (!ObjectId.isValid(user.userId)) {
  return NextResponse.json(
    { success: false, message: "Utilizador inválido." },
    { status: 401 }
  );
}

await ensureLiveIndexes();

const { lives } = await getLiveCollections();

// Impedir que um utilizador crie várias transmissões ativas.
const existingLive = await lives.findOne({
  streamerId: user.userId,
  status: {
    $in: [
      LIVE_CONFIG.STATUS.WAITING,
      LIVE_CONFIG.STATUS.LIVE,
    ],
  },
});

if (existingLive) {
  return NextResponse.json(
    {
      success: false,
      message: "Já tens uma transmissão ativa.",
      liveId: existingLive._id?.toString(),
    },
    { status: 409 }
  );
}

const streamKey = generateStreamKey();

const now = new Date();

const live = {
  streamerId: user.userId,
  streamerName: user.name,
  streamerAvatar: user.avatar || null,

  title,
  description,

  streamKey,

  status: LIVE_CONFIG.STATUS.WAITING,

  viewersCount: 0,
  maxViewers: LIVE_CONFIG.MAX_VIEWERS,

  createdAt: now,
  startedAt: null,
  endedAt: null,
};

const result = await lives.insertOne(live);

return NextResponse.json(
  {
    success: true,
    message: "A tua Live foi criada com sucesso!",
    live: {
      id: result.insertedId.toString(),
      title: live.title,
      description: live.description,
      status: live.status,
      viewersCount: live.viewersCount,
      maxViewers: live.maxViewers,
      createdAt: live.createdAt,
    },
    streamKey,
  },
  { status: 201 }
);

} catch (error) {
console.error("Erro ao criar Live:", error);

return NextResponse.json(
  {
    success: false,
    message: "Não foi possível criar a transmissão.",
  },
  { status: 500 }
);

}
}

// GET — Listar transmissões disponíveis
export async function GET() {
try {
const { lives } = await getLiveCollections();

const activeLives = await lives
  .find(
    { status: LIVE_CONFIG.STATUS.LIVE },
    {
      projection: {
        streamKey: 0,
      },
    }
  )
  .sort({ startedAt: -1 })
  .limit(50)
  .toArray();

return NextResponse.json({
  success: true,
  lives: activeLives.map((live) => ({
    ...live,
    _id: live._id?.toString(),
  })),
});

} catch (error) {
console.error("Erro ao listar Lives:", error);

return NextResponse.json(
  {
    success: false,
    message: "Erro ao carregar transmissões.",
  },
  { status: 500 }
);

}
}
