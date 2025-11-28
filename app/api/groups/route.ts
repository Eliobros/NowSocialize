// api/groups/route.ts - VERSÃO COMPLETA
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import cloudinary from "@/lib/cloudinary"

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
// CRIAR NOVO GRUPO
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type")
    let name: string
    let description: string | undefined
    let memberIds: string[]
    let avatarUrl: string | null = null

    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData()
      name = formData.get("name") as string
      description = (formData.get("description") as string) || undefined
      memberIds = JSON.parse(formData.get("memberIds") as string)
      const avatar = formData.get("avatar") as File

      if (avatar) {
        try {
          const bytes = await avatar.arrayBuffer()
          const buffer = Buffer.from(bytes)

          const uploadResponse = (await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "image",
                  folder: "group_avatars",
                  transformation: [
                    { width: 400, height: 400, crop: "fill" },
                    { quality: "auto" },
                    { format: "auto" }
                  ],
                },
                (error, result) => {
                  if (error) reject(error)
                  else resolve(result)
                },
              )
              .end(buffer)
          })) as any

          avatarUrl = uploadResponse.secure_url
        } catch (error) {
          console.error("Erro no upload do avatar:", error)
        }
      }
    } else {
      const body = await request.json()
      name = body.name
      description = body.description
      memberIds = body.memberIds || []
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Nome do grupo é obrigatório" }, { status: 400 })
    }

    if (!memberIds || memberIds.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um membro" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")
    const conversations = db.collection("conversations")
    const messages = db.collection("messages")

    // Criar o grupo com estrutura completa
    const now = new Date()
    const groupData = {
      name: name.trim(),
      description: description?.trim(),
      avatar: avatarUrl,
      createdBy: new ObjectId(user.userId),
      members: [
        // Criador é super_admin
        {
          userId: new ObjectId(user.userId),
          role: "super_admin",
          joinedAt: now,
          joinMethod: "created",
          messageCount: 0
        },
        // Outros membros são 'member'
        ...memberIds.map((id: string) => ({
          userId: new ObjectId(id),
          role: "member",
          joinedAt: now,
          addedBy: new ObjectId(user.userId),
          joinMethod: "added",
          messageCount: 0
        }))
      ],
      bannedUsers: [],
      settings: {
        onlyAdminsCanSend: false,
        onlyAdminsCanEditInfo: true,
        allowMembersToAddOthers: false,
        maxMembers: 256
      },
      stats: {
        totalMessages: 0,
        totalMembers: memberIds.length + 1,
        messagesLast24h: 0,
        lastActivityAt: now
      },
      createdAt: now,
      updatedAt: now
    }

    const groupResult = await groups.insertOne(groupData)

    // Criar conversa do grupo
    const conversationData = {
      type: "group",
      groupId: groupResult.insertedId,
      lastMessage: {
        content: "Grupo criado",
        sender: "system",
        type: "system",
        createdAt: now
      },
      unreadCount: {},
      mutedBy: [],
      pinnedBy: [],
      archivedBy: [],
      createdAt: now,
      updatedAt: now
    }

    const conversationResult = await conversations.insertOne(conversationData)

    // Criar mensagem de sistema "grupo criado"
    const systemMessage = {
      groupId: groupResult.insertedId,
      sender: "system",
      content: "",
      type: "system",
      systemEvent: {
        type: "group_created",
        actor: user.userId
      },
      readBy: [new ObjectId(user.userId)],
      createdAt: now
    }

    await messages.insertOne(systemMessage)

    // Emitir via Socket.io para todos os membros
    const io = (global as any).io
    if (io) {
      const allMemberIds = [user.userId, ...memberIds]
      allMemberIds.forEach((memberId: string) => {
        io.to(memberId).emit('new_group', {
          groupId: groupResult.insertedId.toString(),
          conversationId: conversationResult.insertedId.toString(),
          name: groupData.name,
          avatar: groupData.avatar
        })
      })
    }

    return NextResponse.json({
      message: "Grupo criado com sucesso",
      groupId: groupResult.insertedId,
      conversationId: conversationResult.insertedId
    })
  } catch (error) {
    console.error("Create group error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// LISTAR GRUPOS DO USUÁRIO
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")

    const userGroups = await groups
      .find({
        "members.userId": new ObjectId(user.userId)
      })
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json({ groups: userGroups })
  } catch (error) {
    console.error("Get groups error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
