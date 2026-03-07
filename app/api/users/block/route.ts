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
// BLOQUEAR USUÁRIO
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 })
    }

    if (userId === user.userId) {
      return NextResponse.json({ error: "Você não pode bloquear a si mesmo" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const blocks = db.collection("blocks")

    await blocks.createIndex({ blocker: 1, blocked: 1 }, { unique: true })

    const blocker = new ObjectId(user.userId)
    const blocked = new ObjectId(userId)

    const existing = await blocks.findOne({ blocker, blocked })
    if (existing) {
      return NextResponse.json({ error: "Usuário já está bloqueado" }, { status: 400 })
    }

    await blocks.insertOne({
      blocker,
      blocked,
      createdAt: new Date(),
    })

    return NextResponse.json({ message: "Usuário bloqueado com sucesso" })
  } catch (error) {
    console.error("Block user error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// DESBLOQUEAR USUÁRIO
// ==========================================
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const blocks = db.collection("blocks")

    const result = await blocks.deleteOne({
      blocker: new ObjectId(user.userId),
      blocked: new ObjectId(userId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Usuário não está bloqueado" }, { status: 400 })
    }

    return NextResponse.json({ message: "Usuário desbloqueado com sucesso" })
  } catch (error) {
    console.error("Unblock user error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// LISTAR USUÁRIOS BLOQUEADOS
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const blocks = db.collection("blocks")

    const blockedUsers = await blocks
      .aggregate([
        {
          $match: { blocker: new ObjectId(user.userId) },
        },
        {
          $lookup: {
            from: "users",
            localField: "blocked",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            _id: "$user._id",
            name: "$user.name",
            username: "$user.username",
            avatar: "$user.avatar",
            blockedAt: "$createdAt",
          },
        },
        {
          $sort: { blockedAt: -1 },
        },
      ])
      .toArray()

    return NextResponse.json({ blockedUsers })
  } catch (error) {
    console.error("Get blocked users error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
