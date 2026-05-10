import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  try {
    const token = authHeader.substring(7)
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

async function translateText(text: string, targetLang: string) {
  try {
    const res = await fetch("http://localhost:5000/translate", {
      method: "POST",
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLang,
        format: "text",
      }),
      headers: { "Content-Type": "application/json" },
    })
    const data = await res.json()
    return data.translatedText || text
  } catch (error) {
    console.error("Erro na tradução:", error)
    return text
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const { conversationId, content, imageUrl } = await request.json()

    const client = await clientPromise
    const db = client.db("socializenow")

    // 1. Buscar a conversa e o destinatário
    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(conversationId)
    })

    if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })

    const originalText = content.trim()
    let finalContent = originalText

    // 2. Lógica de Tradução (Apenas para chats privados)
    if (conversation.type !== "group" && originalText) {
      const receiverId = conversation.participants.find(
        (p: any) => p.toString() !== user.userId
      )

      if (receiverId) {
        const receiverUser = await db.collection("users").findOne({ _id: new ObjectId(receiverId) })
        const targetLang = receiverUser?.preferredLanguage

        if (targetLang && targetLang !== "auto") {
          finalContent = await translateText(originalText, targetLang)
        }
      }
    }

    // 3. Montar o objeto da mensagem
    const messageData = {
      conversationId: new ObjectId(conversationId),
      sender: new ObjectId(user.userId),
      content: finalContent,
      originalContent: originalText,
      image: imageUrl || null,
      read: false,
      createdAt: new Date(),
    }

    const result = await db.collection("messages").insertOne(messageData)

    // 4. Atualizar o "Last Message" na conversa
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          lastMessage: {
            content: finalContent,
            sender: new ObjectId(user.userId),
            createdAt: new Date()
          },
          updatedAt: new Date()
        }
      }
    )

    // 5. Emitir via Socket.io — conteúdo diferente por utilizador
    const io = (global as any).io
    if (io) {
      const senderData = await db.collection("users").findOne(
        { _id: new ObjectId(user.userId) },
        { projection: { name: 1, avatar: 1 } }
      )

      const basePayload = {
        _id: result.insertedId.toString(),
        conversationId,
        sender: {
          _id: user.userId,
          name: senderData?.name,
          avatar: senderData?.avatar
        },
        originalContent: originalText,
        image: imageUrl,
        createdAt: messageData.createdAt.toISOString(),
        read: false
      }

      // Destinatário recebe o conteúdo TRADUZIDO
      io.to(conversationId).emit("new_message", {
        ...basePayload,
        content: finalContent,
      })

      // Remetente recebe o conteúdo ORIGINAL (sobrescreve o anterior)
      io.to(user.userId).emit("new_message", {
        ...basePayload,
        content: originalText,
      })
    }

    return NextResponse.json({ success: true, data: messageData })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
