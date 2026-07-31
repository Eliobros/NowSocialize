import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function getAuthUserId(req: Request): string | null {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any
    return decoded?.userId || null
  } catch {
    return null
  }
}

// GET /api/calls — histórico de chamadas do usuário autenticado
export async function GET(req: Request) {
  const userId = getAuthUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db("socializenow")
    const calls = await db
      .collection("callLogs")
      .find({ userId })
      .sort({ startedAt: -1 })
      .limit(100)
      .toArray()

    return NextResponse.json({ calls })
  } catch (error) {
    console.error("Erro ao buscar histórico de chamadas:", error)
    return NextResponse.json({ error: "Erro ao buscar chamadas" }, { status: 500 })
  }
}

// DELETE /api/calls — limpa o histórico do usuário autenticado
export async function DELETE(req: Request) {
  const userId = getAuthUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db("socializenow")
    await db.collection("callLogs").deleteMany({ userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao limpar histórico de chamadas:", error)
    return NextResponse.json({ error: "Erro ao limpar chamadas" }, { status: 500 })
  }
}
