// api/groups/[groupId]/admin/route.ts - VERSÃO COMPLETA
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { canChangeRole } from "@/utils/groupHelpers"

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
// PROMOVER MEMBRO A ADMIN
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

    // Verificar permissão
    const canChange = canChangeRole(user.userId, userId, group as any)
    if (!canChange.allowed) {
      return NextResponse.json({ error: canChange.reason }, { status: 403 })
    }

    // Verificar se o usuário é membro
    const member = group.members.find((m: any) => m.userId.equals(new ObjectId(userId)))
    if (!member) {
      return NextResponse.json({ error: "Usuário não é membro do grupo" }, { status: 400 })
    }

    // Verificar se já é admin
    if (member.role === 'admin' || member.role === 'super_admin') {
      return NextResponse.json({ error: "Usuário já é administrador" }, { status: 400 })
    }

    const now = new Date()

    // Promover a admin
    await groups.updateOne(
      { 
        _id: new ObjectId(groupId),
        "members.userId": new ObjectId(userId)
      },
      { 
        $set: { 
          "members.$.role": "admin",
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
        type: "user_promoted",
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
      io.to(userId).emit('promoted_to_admin', { groupId })
      io.to(groupId).emit('member_promoted', { groupId, userId })
    }

    return NextResponse.json({ message: "Membro promovido a admin com sucesso" })
  } catch (error) {
    console.error("Promote admin error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// DESPROMOVER ADMIN PARA MEMBRO
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

    // Verificar permissão
    const canChange = canChangeRole(user.userId, userId, group as any)
    if (!canChange.allowed) {
      return NextResponse.json({ error: canChange.reason }, { status: 403 })
    }

    // Verificar se o usuário é membro
    const member = group.members.find((m: any) => m.userId.equals(new ObjectId(userId)))
    if (!member) {
      return NextResponse.json({ error: "Usuário não é membro do grupo" }, { status: 400 })
    }

    // Verificar se é admin
    if (member.role !== 'admin') {
      return NextResponse.json({ error: "Usuário não é administrador" }, { status: 400 })
    }

    const now = new Date()

    // Despromover
    await groups.updateOne(
      { 
        _id: new ObjectId(groupId),
        "members.userId": new ObjectId(userId)
      },
      { 
        $set: { 
          "members.$.role": "member",
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
        type: "user_demoted",
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
      io.to(userId).emit('demoted_from_admin', { groupId })
      io.to(groupId).emit('member_demoted', { groupId, userId })
    }

    return NextResponse.json({ message: "Admin despromovido com sucesso" })
  } catch (error) {
    console.error("Demote admin error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
