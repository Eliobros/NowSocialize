import { Document } from "mongodb";
import clientPromise from "@/lib/mongodb";

import { LIVE_CONFIG } from "./config";
import { Live, LiveMessage, LiveViewer } from "./types";

export async function getLiveCollections() {
  const client = await clientPromise;
  const db = client.db("socializenow");

  return {
    lives: db.collection<Live & Document>(
      LIVE_CONFIG.COLLECTIONS.LIVES
    ),

    messages: db.collection<LiveMessage & Document>(
      LIVE_CONFIG.COLLECTIONS.MESSAGES
    ),

    viewers: db.collection<LiveViewer & Document>(
      LIVE_CONFIG.COLLECTIONS.VIEWERS
    ),
  };
}

let indexesPromise: Promise<void> | null = null;

export async function ensureLiveIndexes() {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const { lives, messages, viewers } =
        await getLiveCollections();

      await Promise.all([
        lives.createIndex({ streamerId: 1 }),
        lives.createIndex({ status: 1, createdAt: -1 }),
        lives.createIndex({ streamKey: 1 }, { unique: true }),

        messages.createIndex({ liveId: 1, createdAt: 1 }),

        viewers.createIndex(
          { liveId: 1, userId: 1 },
          { unique: true }
        ),

        viewers.createIndex({ liveId: 1 }),
        viewers.createIndex({ socketId: 1 }),
      ]);
    })().catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }

  return indexesPromise;
}
