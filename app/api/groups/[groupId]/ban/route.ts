// api/groups/[groupId]/ban/route.ts - BANIR E DESBANIR USUÁRIOS
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { canBanUser } from "@/utils/groupHelpers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch (error) {
    return null
  }
}

// ==========================================
// BANIR USUÁRIO
// ==========================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { groupId } = await params
    const { userId, reason } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")
    const messages = db.collection("messages")

    const group = await groups.findOne({ _id: new ObjectId(groupId) })
    if (!group) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Verificar permissão
    const canBan = canBanUser(user.userId, userId, group as any)
    if (!canBan.allowed) {
      return NextResponse.json({ error: canBan.reason }, { status: 403 })
    }

    // Verificar se já está banido
    const alreadyBanned = group.bannedUsers?.some((b: any) => 
      b.userId.equals(new ObjectId(userId))
    )

    if (alreadyBanned) {
      return NextResponse.json({ error: "Usuário já está banido" }, { status: 400 })
    }

    const now = new Date()

    // Remover das members e adicionar em bannedUsers
    await groups.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $pull: { 
          members: { userId: new ObjectId(userId) }
        },
        $push: {
          bannedUsers: {
            userId: new ObjectId(userId),
            bannedBy: new ObjectId(user.userId),
            bannedAt: now,
            reason: reason || undefined
          }
        },
        $set: { 
          updatedAt: now,
          "stats.totalMembers": group.members.length - 1
        }
      }
    )

    // Criar mensagem de sistema
    const systemMessage = {
      groupId: new ObjectId(groupId),
      sender: "system",
      content: "",
      type: "system",
      systemEvent: {
        type: "user_banned",
        actor: user.userId,
        target: userId
      },
      readBy: [new ObjectId(user.userId)],
      createdAt: now
    }

    await messages.insertOne(systemMessage)

    // Emitir via Socket.io
    const io = (global as any).io
    if (io) {
      io.to(userId).emit('banned_from_group', { groupId })
      io.to(groupId).emit('user_banned', { groupId, userId })
    }

    return NextResponse.json({ message: "Usuário banido com sucesso" })
  } catch (error) {
    console.error("Ban user error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// DESBANIR USUÁRIO
// ==========================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { groupId } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")
    const messages = db.collection("messages")

    const group = await groups.findOne({ _id: new ObjectId(groupId) })
    if (!group) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Verificar se é admin
    const actor = group.members.find((m: any) => m.userId.equals(new ObjectId(user.userId)))
    if (!actor || actor.role === 'member') {
      return NextResponse.json({ 
        error: "Apenas administradores podem desbanir membros" 
      }, { status: 403 })
    }

    // Verificar se está banido
    const bannedUser = group.bannedUsers?.find((b: any) => 
      b.userId.equals(new ObjectId(userId))
    )

    if (!bannedUser) {
      return NextResponse.json({ error: "Usuário não está banido" }, { status: 400 })
    }

    const now = new Date()

    // Remover de bannedUsers (não adiciona de volta aos membros automaticamente)
    await groups.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $pull: { 
          bannedUsers: { userId: new ObjectId(userId) }
        },
        $set: { 
          updatedAt: now
        }
      }
    )

    // Criar mensagem de sistema
    const systemMessage = {
      groupId: new ObjectId(groupId),
      sender: "system",
      content: "",
      type: "system",
      systemEvent: {
        type: "user_unbanned",
        actor: user.userId,
        target: userId
      },
      readBy: [new ObjectId(user.userId)],
      createdAt: now
    }

    await messages.insertOne(systemMessage)

    // Emitir via Socket.io
    const io = (global as any).io
    if (io) {
      io.to(userId).emit('unbanned_from_group', { groupId })
      io.to(groupId).emit('user_unbanned', { groupId, userId })
    }

    return NextResponse.json({ message: "Usuário desbanido com sucesso" })
  } catch (error) {
    console.error("Unban user error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
