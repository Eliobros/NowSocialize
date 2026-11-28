import { getLiveCollections } from "./database";
import { LIVE_CONFIG } from "./config";

export type PublishDenyReason = "unknown-key" | "ended" | "race";

export interface PublishGateResult {
  allowed: boolean;
  liveId: string | null;
  autoStarted: boolean;
  reason: "ok" | PublishDenyReason;
  title: string | null;
  streamerId: string | null;
  streamerName: string | null;
  startedAt: Date | null;
}

/**
 * Portão único de publicação por streamKey, usado pelo webhook validate-key
 * e pelo mtmx-auth (auth HTTP do MediaMTX). Idempotente: chamadas repetidas
 * com a mesma chave válida continuam permitindo (autoStarted=false da 2ª vez).
 */
export async function authorizePublishByKey(
  streamKey: string
): Promise<PublishGateResult> {
  const denied = (reason: PublishDenyReason): PublishGateResult => ({
    allowed: false,
    liveId: null,
    autoStarted: false,
    reason,
    title: null,
    streamerId: null,
    streamerName: null,
    startedAt: null,
  });

  const { lives } = await getLiveCollections();

  const live = await lives.findOne(
    { streamKey },
    { projection: { streamKey: 0 } }
  );

  if (!live) return denied("unknown-key");
  if (live.status === LIVE_CONFIG.STATUS.ENDED) return denied("ended");

  const liveId = live._id?.toString() ?? "";

  // Já no ar: permite sem mexer em nada.
  if (live.status === LIVE_CONFIG.STATUS.LIVE) {
    return {
      allowed: true,
      liveId,
      autoStarted: false,
      reason: "ok",
      title: live.title,
      streamerId: live.streamerId,
      streamerName: live.streamerName,
      startedAt: live.startedAt ?? null,
    };
  }

  // Auto start atômico waiting -> live (só um vence a corrida).
  const now = new Date();
  const started = await lives.updateOne(
    { _id: live._id, status: LIVE_CONFIG.STATUS.WAITING },
    {
      $set: {
        status: LIVE_CONFIG.STATUS.LIVE,
        startedAt: now,
      },
    }
  );

  if (started.modifiedCount === 1) {
    return {
      allowed: true,
      liveId,
      autoStarted: true,
      reason: "ok",
      title: live.title,
      streamerId: live.streamerId,
      streamerName: live.streamerName,
      startedAt: now,
    };
  }

  // Perdeu a corrida: relê para responder com o estado real.
  const current = await lives.findOne(
    { _id: live._id },
    { projection: { streamKey: 0 } }
  );

  if (current?.status === LIVE_CONFIG.STATUS.LIVE) {
    return {
      allowed: true,
      liveId,
      autoStarted: false,
      reason: "ok",
      title: current.title,
      streamerId: current.streamerId,
      streamerName: current.streamerName,
      startedAt: current.startedAt ?? null,
    };
  }

  return denied("race");
}
