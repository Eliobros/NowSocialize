import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { LIVE_CONFIG } from "./config";

/**
 * Gera uma chave secreta para cada transmissão.
 */
export function generateStreamKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Valida um MongoDB ObjectId.
 */
export function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Converte uma string para ObjectId.
 */
export function toObjectId(id: string): ObjectId | null {
  if (!isValidObjectId(id)) return null;

  return new ObjectId(id);
}

/**
 * Limpa e valida títulos.
 */
export function sanitizeLiveTitle(title: unknown): string | null {
  if (typeof title !== "string") return null;

  const sanitized = title.trim();

  if (sanitized.length < 3 || sanitized.length > 100) {
    return null;
  }

  return sanitized;
}

/**
 * Limpa descrições.
 */
export function sanitizeLiveDescription(
  description: unknown
): string {
  if (typeof description !== "string") return "";

  return description.trim().slice(0, 500);
}

/**
 * Obtém o limite de espectadores.
 */
export function getMaxViewers(): number {
  return LIVE_CONFIG.MAX_VIEWERS;
}

/**
 * Verifica se uma transmissão ainda aceita espectadores.
 */
export function canJoinLive(
  status: string,
  viewersCount: number,
  maxViewers: number
): boolean {
  return (
    status === LIVE_CONFIG.STATUS.LIVE &&
    viewersCount < maxViewers
  );
}
