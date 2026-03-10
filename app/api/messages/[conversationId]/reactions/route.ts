import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

const ALLOWED_EMOJIS = ["❤️", "😂", "😮", "😢", "😡"]

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

    const { messageId, emoji } = await request.json()

    if (!messageId || !emoji) {
      return NextResponse.json({ error: "messageId e emoji são obrigatórios" }, { status: 400 })
    }

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Emoji não permitido" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const messages = db.collection("messages")

    const message = await messages.findOne({
      _id: new ObjectId(messageId),
      conversationId: new ObjectId(conversationId),
    })

    if (!message) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    const userId = new ObjectId(user.userId)
    const reactions: any[] = message.reactions || []

    const existingIndex = reactions.findIndex(
      (r: any) => r.userId.toString() === userId.toString()
    )

    if (existingIndex !== -1) {
      if (reactions[existingIndex].emoji === emoji) {
        // Same emoji: toggle off (remove)
        reactions.splice(existingIndex, 1)
      } else {
        // Different emoji: replace
        reactions[existingIndex] = { userId, emoji, createdAt: new Date() }
      }
    } else {
      // No existing reaction: add
      reactions.push({ userId, emoji, createdAt: new Date() })
    }

    await messages.updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { reactions } }
    )

    return NextResponse.json({ reactions })
  } catch (error) {
    console.error("Erro ao reagir à mensagem:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
