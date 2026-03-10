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

export async function POST(
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
    const conversations = db.collection("conversations")

    const userId = new ObjectId(user.userId)

    // Mark all messages not sent by current user as read and add to readBy
    await messages.updateMany(
      {
        conversationId: new ObjectId(conversationId),
        sender: { $ne: userId },
      },
      {
        $set: { read: true },
        $addToSet: { readBy: userId },
      }
    )

    // Reset unreadCount for this user in the conversation document
    await conversations.updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { [`unreadCount.${user.userId}`]: 0 } }
    )

    return NextResponse.json({ message: "Mensagens marcadas como lidas" })
  } catch (error) {
    console.error("Erro ao marcar mensagens como lidas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
