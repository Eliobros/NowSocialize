import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import cloudinary from "@/lib/cloudinary"
import { emitNewMessage } from "@/lib/socket-relay"

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

    // Aceita tanto JSON quanto multipart/form-data (imagens)
    const contentType = request.headers.get("content-type") || ""
    let conversationId = ""
    let content = ""
    let imageUrl: string | null = null
    let replyToId: string | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData: any = await request.formData()
      conversationId = formData.get("conversationId") || ""
      content = formData.get("content") || ""
      replyToId = formData.get("replyToId") || null
      const image = formData.get("image") as File | null

      if (image && image.size > 0) {
        if (!image.type.startsWith("image/")) {
          return NextResponse.json({ error: "Apenas arquivos de imagem são permitidos" }, { status: 400 })
        }
        if (image.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: "A imagem deve ter no máximo 10MB" }, { status: 400 })
        }

        // Upload para Cloudinary na pasta "chat"
        const bytes = await image.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString("base64")
        const dataURI = `data:${image.type};base64,${base64}`

        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: "chat",
          use_filename: true,
          unique_filename: false,
        })
        imageUrl = uploadResult.secure_url
      }
    } else {
      const body = await request.json()
      conversationId = body.conversationId
      content = body.content || ""
      imageUrl = body.imageUrl || null
      replyToId = body.replyToId || null
    }

    if (!conversationId) {
      return NextResponse.json({ error: "ID da conversa é obrigatório" }, { status: 400 })
    }
    if (!content.trim() && !imageUrl) {
      return NextResponse.json({ error: "Conteúdo ou imagem é obrigatório" }, { status: 400 })
    }

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
    const messageData: any = {
      conversationId: new ObjectId(conversationId),
      sender: new ObjectId(user.userId),
      content: finalContent,
      originalContent: originalText,
      image: imageUrl,
      read: false,
      createdAt: new Date(),
    }

    if (replyToId && ObjectId.isValid(replyToId)) {
      messageData.replyToId = new ObjectId(replyToId)
    }

    const result = await db.collection("messages").insertOne(messageData)

    // 4. Atualizar o "Last Message" na conversa
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          lastMessage: {
            content: finalContent || (imageUrl ? "📷 Imagem" : ""),
            sender: new ObjectId(user.userId),
            createdAt: new Date()
          },
          updatedAt: new Date()
        }
      }
    )

    // 5. Emitir via Socket.io — conteúdo diferente por utilizador
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
      // O GET retorna replyTo como objeto completo (via $lookup);
      // aqui enviamos sem replyTo para o payload em tempo real ser seguro.
      createdAt: messageData.createdAt.toISOString(),
      read: false
    }

    // Destinatário recebe o conteúdo TRADUZIDO; remetente recebe o ORIGINAL.
    // Fire-and-forget: não atrasa a resposta do POST se o socket server estiver fora.
    void emitNewMessage({
      conversationId,
      senderId: user.userId,
      message: { ...basePayload, content: finalContent },
      senderMessage: { ...basePayload, content: originalText },
    })

    return NextResponse.json({ success: true, data: messageData })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
