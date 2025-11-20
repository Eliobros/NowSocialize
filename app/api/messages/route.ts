import { type NextRequest, NextResponse } from "next/server"
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

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type")
    let conversationId: string
    let content: string
    let imageUrl: string | null = null

    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData()
      conversationId = formData.get("conversationId") as string
      content = (formData.get("content") as string) || ""
      const image = formData.get("image") as File

      if (!conversationId) {
        return NextResponse.json({ error: "ID da conversa é obrigatório" }, { status: 400 })
      }

      if (!content.trim() && !image) {
        return NextResponse.json({ error: "Conteúdo ou imagem são obrigatórios" }, { status: 400 })
      }

      if (image) {
        try {
          const bytes = await image.arrayBuffer()
          const buffer = Buffer.from(bytes)

          const uploadResponse = (await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "image",
                  folder: "message_images",
                  transformation: [
                    { width: 800, height: 600, crop: "limit" },
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

          imageUrl = uploadResponse.secure_url
        } catch (error) {
          console.error("Erro no upload da imagem:", error)
          return NextResponse.json({ error: "Erro ao fazer upload da imagem" }, { status: 500 })
        }
      }
    } else {
      const body = await request.json()
      conversationId = body.conversationId
      content = body.content

      if (!conversationId || !content) {
        return NextResponse.json({ error: "ID da conversa e conteúdo são obrigatórios" }, { status: 400 })
      }
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const messages = db.collection("messages")
    const conversations = db.collection("conversations")

    const conversation = await conversations.findOne({ _id: new ObjectId(conversationId) })
    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const receiverId = conversation.participants.find((p: ObjectId) => !p.equals(new ObjectId(user.userId)))

    const messageData: any = {
      conversationId: new ObjectId(conversationId),
      sender: new ObjectId(user.userId),
      receiver: receiverId,
      content: content.trim(),
      read: false,
      createdAt: new Date(),
    }

    if (imageUrl) {
      messageData.image = imageUrl
    }

    const result = await messages.insertOne(messageData)

    const lastMessageContent = imageUrl ? content.trim() || "📷 Imagem" : content.trim()
    await conversations.updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          lastMessage: {
            content: lastMessageContent,
            sender: new ObjectId(user.userId),
            createdAt: new Date(),
          },
          updatedAt: new Date(),
        },
      }
    )


    // ✨ ADICIONA ISSO AQUI ✨
// Emitir via Socket.io
const io = (global as any).io
if (io) {
  io.to(conversationId).emit('new_message', {
    _id: result.insertedId.toString(),
    conversationId: conversationId,
    sender: {
      _id: user.userId,
      // Buscar dados do sender se necessário
    },
    receiver: receiverId,
    content: messageData.content,
    image: messageData.image,
    createdAt: messageData.createdAt.toISOString(),
    read: false
  })
  console.log(`✅ Mensagem emitida via Socket.io para conversa ${conversationId}`)
}

return NextResponse.json({
  message: "Mensagem enviada com sucesso",
  messageId: result.insertedId,
  data: {
    ...messageData,
    _id: result.insertedId,
  }
})

    return NextResponse.json({
      message: "Mensagem enviada com sucesso",
      messageId: result.insertedId,
      data: {
        ...messageData,
        _id: result.insertedId,
      }
    })
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
