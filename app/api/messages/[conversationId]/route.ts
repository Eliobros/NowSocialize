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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { conversationId } = await params
    if (!conversationId) {
      return NextResponse.json({ error: "ID da conversa é obrigatório" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const messages = db.collection("messages")

    const conversationMessages = await messages
      .aggregate([
        {
          $match: {
            conversationId: new ObjectId(conversationId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "sender",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "receiver",
            foreignField: "_id",
            as: "receiverData",
          },
        },
        { $unwind: "$sender" },
        {
          $unwind: {
            path: "$receiverData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "messages",
            localField: "replyToId",
            foreignField: "_id",
            as: "replyToData",
          },
        },
        {
          $unwind: {
            path: "$replyToData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "replyToData.sender",
            foreignField: "_id",
            as: "replyToSender",
          },
        },
        {
          $unwind: {
            path: "$replyToSender",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            content: 1,
            image: 1,
            audioUrl: 1,
            type: 1,
            duration: 1,
            read: 1,
            createdAt: 1,
            "sender._id": 1,
            "sender.name": 1,
            "sender.avatar": 1,
            "receiver._id": "$receiverData._id",
            "receiver.name": "$receiverData.name",
            "receiver.avatar": "$receiverData.avatar",
            replyTo: {
              $cond: {
                if: "$replyToData",
                then: {
                  _id: "$replyToData._id",
                  content: "$replyToData.content",
                  sender: {
                    _id: "$replyToSender._id",
                    name: "$replyToSender.name",
                  },
                },
                else: "$$REMOVE",
              },
            },
          },
        },
        {
          $sort: { createdAt: 1 },
        },
      ])
      .toArray()

    return NextResponse.json({ messages: conversationMessages })
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
