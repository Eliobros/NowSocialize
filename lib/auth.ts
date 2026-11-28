import { type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
}

export function verifyToken(
  request: NextRequest
): AuthUser | null {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET não configurado");
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      typeof decoded !== "object" ||
      !decoded ||
      typeof decoded.userId !== "string"
    ) {
      return null;
    }

    return decoded as AuthUser;
  } catch {
    return null;
  }
}
