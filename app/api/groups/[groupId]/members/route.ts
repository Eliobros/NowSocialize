// api/groups/[groupId]/members/route.ts - VERSÃO COMPLETA
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { canAddMembers, canRemoveMember, isGroupFull, isUserBanned } from "@/utils/groupHelpers"

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
// ADICIONAR MEMBROS AO GRUPO
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
    const { userIds } = await request.json()

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um usuário" }, { status: 400 })
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
    const canAdd = canAddMembers(user.userId, group as any)
    if (!canAdd.allowed) {
      return NextResponse.json({ error: canAdd.reason }, { status: 403 })
    }

    // Verificar se grupo está cheio
    if (isGroupFull(group as any)) {
      return NextResponse.json({ error: "Grupo atingiu o limite máximo de membros" }, { status: 400 })
    }

    // Filtrar usuários que já são membros ou estão banidos
    const existingMemberIds = group.members.map((m: any) => m.userId.toString())
    const bannedUserIds = group.bannedUsers?.map((b: any) => b.userId.toString()) || []
    
    const newUserIds = userIds.filter((id: string) => 
      !existingMemberIds.includes(id) && !bannedUserIds.includes(id)
    )

    if (newUserIds.length === 0) {
      return NextResponse.json({ error: "Nenhum usuário válido para adicionar" }, { status: 400 })
    }

    // Verificar limite
    if (group.members.length + newUserIds.length > group.settings.maxMembers) {
      return NextResponse.json({ 
        error: `Só é possível adicionar ${group.settings.maxMembers - group.members.length} membros` 
      }, { status: 400 })
    }

    const now = new Date()

    // Adicionar novos membros
    const newMembers = newUserIds.map((id: string) => ({
      userId: new ObjectId(id),
      role: "member",
      joinedAt: now,
      addedBy: new ObjectId(user.userId),
      joinMethod: "added",
      messageCount: 0
    }))

    await groups.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $push: { members: { $each: newMembers } },
        $set: { 
          updatedAt: now,
          "stats.totalMembers": group.members.length + newUserIds.length
        }
      }
    )

    // Criar mensagens de sistema para cada membro adicionado
    const systemMessages = newUserIds.map((userId: string) => ({
      groupId: new ObjectId(groupId),
      sender: "system",
      content: "",
      type: "system",
      systemEvent: {
        type: "user_added",
        actor: user.userId,
        target: userId
      },
      readBy: [new ObjectId(user.userId)],
      createdAt: now
    }))

    await messages.insertMany(systemMessages)

    // Emitir via Socket.io
    const io = (global as any).io
    if (io) {
      newUserIds.forEach((userId: string) => {
        io.to(userId).emit('added_to_group', {
          groupId,
          groupName: group.name
        })
      })
      
      io.to(groupId).emit('members_added', {
        groupId,
        newMemberIds: newUserIds
      })
    }

    return NextResponse.json({ 
      message: "Membros adicionados com sucesso",
      addedCount: newUserIds.length
    })
  } catch (error) {
    console.error("Add members error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// REMOVER MEMBRO DO GRUPO
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

    const isSelf = user.userId === userId

    // Se não é auto-remoção, verificar permissões
    if (!isSelf) {
      const canRemove = canRemoveMember(user.userId, userId, group as any)
      if (!canRemove.allowed) {
        return NextResponse.json({ error: canRemove.reason }, { status: 403 })
      }
    }

    const now = new Date()

    // Remover membro (e também dos admins se for)
    await groups.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $pull: { 
          members: { userId: new ObjectId(userId) }
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
        type: isSelf ? "user_left" : "user_removed",
        actor: isSelf ? userId : user.userId,
        target: isSelf ? undefined : userId
      },
      readBy: [new ObjectId(user.userId)],
      createdAt: now
    }

    await messages.insertOne(systemMessage)

    // Emitir via Socket.io
    const io = (global as any).io
    if (io) {
      io.to(userId).emit('removed_from_group', { groupId })
      io.to(groupId).emit('member_removed', { groupId, userId })
    }

    return NextResponse.json({ message: "Membro removido com sucesso" })
  } catch (error) {
    console.error("Remove member error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
