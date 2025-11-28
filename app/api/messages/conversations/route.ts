// api/messages/conversations/route.ts - COMPLETO COM SUPORTE A GRUPOS
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
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const conversations = db.collection("conversations")

    // Buscar conversas onde o usuário participa
    const userConversations = await conversations
      .aggregate([
        {
          $match: {
            $or: [
              // Conversas diretas onde o usuário é participante
              { 
                type: "direct",
                participants: new ObjectId(user.userId) 
              },
              // Grupos (vamos filtrar depois se o usuário é membro)
              { 
                type: "group",
                groupId: { $exists: true }
              }
            ]
          },
        },
        // Lookup para detalhes dos grupos
        {
          $lookup: {
            from: "groups",
            localField: "groupId",
            foreignField: "_id",
            as: "groupDetails"
          }
        },
        // Lookup para participantes das conversas diretas
        {
          $lookup: {
            from: "users",
            localField: "participants",
            foreignField: "_id",
            as: "participantDetails",
          },
        },
        // Adicionar campos calculados
        {
          $addFields: {
            // Para conversas diretas
            participants: {
              $cond: {
                if: { $eq: ["$type", "direct"] },
                then: "$participantDetails",
                else: []
              }
            },
            // Para grupos
            groupInfo: {
              $cond: {
                if: { $eq: ["$type", "group"] },
                then: {
                  $let: {
                    vars: { 
                      group: { $arrayElemAt: ["$groupDetails", 0] } 
                    },
                    in: {
                      name: "$$group.name",
                      description: "$$group.description",
                      avatar: "$$group.avatar",
                      admins: "$$group.admins",
                      memberCount: { $size: "$$group.members" }
                    }
                  }
                },
                else: null
              }
            },
            unreadCount: 0, // TODO: Implementar contagem de não lidas
          },
        },
        // Filtrar apenas grupos onde o usuário é membro
        {
          $match: {
            $or: [
              { type: "direct" },
              { 
                type: "group",
                "groupDetails.members.userId": new ObjectId(user.userId)
              }
            ]
          }
        },
        // Projetar apenas campos necessários
        {
          $project: {
            type: 1,
            groupId: 1,
            participants: {
              _id: 1,
              name: 1,
              avatar: 1,
              isOnline: 1,
              lastSeen: 1,
            },
            groupInfo: 1,
            lastMessage: 1,
            unreadCount: 1,
            updatedAt: 1,
            createdAt: 1,
          },
        },
        // Ordenar por última atualização
        {
          $sort: { updatedAt: -1 },
        },
      ])
      .toArray()

    return NextResponse.json({ conversations: userConversations })
  } catch (error) {
    console.error("Get conversations error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

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

    const client = await clientPromise
    const db = client.db("socializenow")
    const conversations = db.collection("conversations")

    // Verificar se conversa já existe
    const existingConversation = await conversations.findOne({
      type: "direct",
      participants: {
        $all: [new ObjectId(user.userId), new ObjectId(userId)],
        $size: 2,
      },
    })

    if (existingConversation) {
      return NextResponse.json({ conversationId: existingConversation._id })
    }

    // Criar nova conversa direta
    const result = await conversations.insertOne({
      type: "direct",
      participants: [new ObjectId(user.userId), new ObjectId(userId)],
      lastMessage: {
        content: "",
        sender: new ObjectId(user.userId),
        createdAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ conversationId: result.insertedId })
  } catch (error) {
    console.error("Create conversation error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
