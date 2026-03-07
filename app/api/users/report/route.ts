import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

// ==========================================
// DENUNCIAR USUÁRIO
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { userId, reason } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 })
    }

    if (userId === user.userId) {
      return NextResponse.json({ error: "Você não pode denunciar a si mesmo" }, { status: 400 })
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "O motivo da denúncia é obrigatório" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const reports = db.collection("reports")

    await reports.insertOne({
      reporter: new ObjectId(user.userId),
      reported: new ObjectId(userId),
      reason: reason.trim(),
      createdAt: new Date(),
      status: "pending",
    })

    return NextResponse.json({ message: "Denúncia enviada com sucesso" })
  } catch (error) {
    console.error("Report user error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
