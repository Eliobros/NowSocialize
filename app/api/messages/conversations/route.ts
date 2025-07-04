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

    // Get conversations where user is a participant
    const userConversations = await conversations
      .aggregate([
        {
          $match: {
            participants: new ObjectId(user.userId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "participants",
            foreignField: "_id",
            as: "participantDetails",
          },
        },
        {
          $addFields: {
            participants: "$participantDetails",
            unreadCount: 0, // TODO: Implement unread count
          },
        },
        {
          $project: {
            participants: {
              _id: 1,
              name: 1,
              avatar: 1,
            },
            lastMessage: 1,
            unreadCount: 1,
            updatedAt: 1,
          },
        },
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

    // Check if conversation already exists
    const existingConversation = await conversations.findOne({
      participants: {
        $all: [new ObjectId(user.userId), new ObjectId(userId)],
        $size: 2,
      },
    })

    if (existingConversation) {
      return NextResponse.json({ conversationId: existingConversation._id })
    }

    // Create new conversation
    const result = await conversations.insertOne({
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
