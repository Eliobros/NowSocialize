import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getLiveCollections } from "@/lib/live/database";

interface RouteContext {
params: Promise<{
liveId: string;
}>;
}

export async function GET(
request: NextRequest,
context: RouteContext
) {
try {
const { liveId } = await context.params;

if (!ObjectId.isValid(liveId)) {
  return NextResponse.json(
    {
      success: false,
      message: "ID da transmissão inválido.",
    },
    { status: 400 }
  );
}

const { lives } = await getLiveCollections();

const live = await lives.findOne(
  { _id: new ObjectId(liveId) },
  {
    projection: {
      streamKey: 0,
    },
  }
);

if (!live) {
  return NextResponse.json(
    {
      success: false,
      message: "Transmissão não encontrada.",
    },
    { status: 404 }
  );
}

return NextResponse.json({
  success: true,
  live: {
    id: live._id!.toString(),
    streamerId: live.streamerId,
    streamerName: live.streamerName,
    streamerAvatar: live.streamerAvatar,
    title: live.title,
    description: live.description,
    thumbnail: live.thumbnail,
    status: live.status,
    viewersCount: live.viewersCount,
    maxViewers: live.maxViewers,
    createdAt: live.createdAt,
    startedAt: live.startedAt,
    endedAt: live.endedAt,
  },
});

} catch (error) {
console.error("Erro ao consultar Live:", error);

return NextResponse.json(
  {
    success: false,
    message: "Erro ao consultar transmissão.",
  },
  { status: 500 }
);

}
}
