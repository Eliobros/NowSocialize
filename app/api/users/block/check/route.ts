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
// VERIFICAR STATUS DE BLOQUEIO
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const blocks = db.collection("blocks")

    const currentUserId = new ObjectId(user.userId)
    const targetUserId = new ObjectId(userId)

    const [blockedByMe, blockedByThem] = await Promise.all([
      blocks.findOne({ blocker: currentUserId, blocked: targetUserId }),
      blocks.findOne({ blocker: targetUserId, blocked: currentUserId }),
    ])

    return NextResponse.json({
      blockedByMe: !!blockedByMe,
      blockedByThem: !!blockedByThem,
    })
  } catch (error) {
    console.error("Check block status error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
