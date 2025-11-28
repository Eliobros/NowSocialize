// api/groups/[groupId]/route.ts - VERSÃO COMPLETA
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { canEditGroupInfo } from "@/utils/groupHelpers"

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
// OBTER DETALHES DO GRUPO
// ==========================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { groupId } = await params

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")

    const group = await groups.aggregate([
      { $match: { _id: new ObjectId(groupId) } },
      {
        $lookup: {
          from: "users",
          localField: "members.userId",
          foreignField: "_id",
          as: "memberDetails"
        }
      },
      {
        $addFields: {
          members: {
            $map: {
              input: "$members",
              as: "member",
              in: {
                $mergeObjects: [
                  "$$member",
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$memberDetails",
                          as: "detail",
                          cond: { $eq: ["$$detail._id", "$$member.userId"] }
                        }
                      },
                      0
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          memberDetails: 0,
          "members.password": 0,
          "members.email": 0
        }
      }
    ]).toArray()

    if (!group || group.length === 0) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ group: group[0] })
  } catch (error) {
    console.error("Get group error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// ATUALIZAR INFORMAÇÕES DO GRUPO
// ==========================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { groupId } = await params
    const body = await request.json()
    const { name, description, settings } = body

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")
    const messages = db.collection("messages")

    // Buscar grupo
    const group = await groups.findOne({ _id: new ObjectId(groupId) })
    if (!group) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Verificar permissão
    const canEdit = canEditGroupInfo(user.userId, group as any)
    if (!canEdit.allowed) {
      return NextResponse.json({ error: canEdit.reason }, { status: 403 })
    }

    const updateData: any = {
      updatedAt: new Date()
    }
    const systemMessages: any[] = []

    // Atualizar nome
    if (name && name !== group.name) {
      systemMessages.push({
        groupId: new ObjectId(groupId),
        sender: "system",
        content: "",
        type: "system",
        systemEvent: {
          type: "name_changed",
          actor: user.userId,
          oldValue: group.name,
          newValue: name
        },
        readBy: [new ObjectId(user.userId)],
        createdAt: new Date()
      })
      updateData.name = name.trim()
    }

    // Atualizar descrição
    if (description !== undefined && description !== group.description) {
      systemMessages.push({
        groupId: new ObjectId(groupId),
        sender: "system",
        content: "",
        type: "system",
        systemEvent: {
          type: "description_changed",
          actor: user.userId
        },
        readBy: [new ObjectId(user.userId)],
        createdAt: new Date()
      })
      updateData.description = description?.trim()
    }

    // Atualizar settings
    if (settings) {
      systemMessages.push({
        groupId: new ObjectId(groupId),
        sender: "system",
        content: "",
        type: "system",
        systemEvent: {
          type: "settings_changed",
          actor: user.userId
        },
        readBy: [new ObjectId(user.userId)],
        createdAt: new Date()
      })
      updateData.settings = { ...group.settings, ...settings }
    }

    await groups.updateOne(
      { _id: new ObjectId(groupId) },
      { $set: updateData }
    )

    // Inserir mensagens de sistema
    if (systemMessages.length > 0) {
      await messages.insertMany(systemMessages)
    }

    // Emitir atualização via Socket.io
    const io = (global as any).io
    if (io) {
      io.to(groupId).emit('group_updated', {
        groupId,
        ...updateData
      })
    }

    return NextResponse.json({ message: "Grupo atualizado com sucesso" })
  } catch (error) {
    console.error("Update group error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// DELETAR GRUPO (apenas criador)
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

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")
    const conversations = db.collection("conversations")
    const messages = db.collection("messages")

    const group = await groups.findOne({ _id: new ObjectId(groupId) })
    if (!group) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Apenas o criador pode deletar
    if (!group.createdBy.equals(new ObjectId(user.userId))) {
      return NextResponse.json({ error: "Apenas o criador pode deletar o grupo" }, { status: 403 })
    }

    // Deletar grupo, conversa e mensagens
    await groups.deleteOne({ _id: new ObjectId(groupId) })
    await conversations.deleteMany({ groupId: new ObjectId(groupId) })
    await messages.deleteMany({ groupId: new ObjectId(groupId) })

    // Emitir via Socket.io
    const io = (global as any).io
    if (io) {
      io.to(groupId).emit('group_deleted', { groupId })
    }

    return NextResponse.json({ message: "Grupo deletado com sucesso" })
  } catch (error) {
    console.error("Delete group error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
