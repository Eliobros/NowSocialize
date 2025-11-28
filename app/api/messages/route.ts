// api/messages/route.ts - COMPLETO COM SUPORTE A GRUPOS
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

    // Processar FormData (com imagem) ou JSON (só texto)
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

      // Upload da imagem
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

    // Buscar conversa
    const conversation = await conversations.findOne({ _id: new ObjectId(conversationId) })
    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const isGroup = conversation.type === "group"

    // Construir objeto da mensagem
    const messageData: any = {
      conversationId: new ObjectId(conversationId),
      sender: new ObjectId(user.userId),
      content: content.trim(),
      read: false,
      createdAt: new Date(),
    }

    // Para GRUPOS
    if (isGroup) {
      messageData.groupId = conversation.groupId
      messageData.readBy = [new ObjectId(user.userId)] // Apenas o sender leu inicialmente
    } else {
      // Para CONVERSAS DIRETAS
      const receiverId = conversation.participants.find((p: ObjectId) => !p.equals(new ObjectId(user.userId)))
      messageData.receiver = receiverId
    }

    if (imageUrl) {
      messageData.image = imageUrl
    }

    // Inserir mensagem
    const result = await messages.insertOne(messageData)

    // Atualizar lastMessage da conversa
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

    // 🔥 EMITIR VIA SOCKET.IO
    const io = (global as any).io
    if (io) {
      // Buscar dados do sender para enviar completo
      const users = db.collection("users")
      const senderData = await users.findOne(
        { _id: new ObjectId(user.userId) },
        { projection: { name: 1, avatar: 1 } }
      )

      const messageToEmit = {
        _id: result.insertedId.toString(),
        conversationId: conversationId,
        sender: {
          _id: user.userId,
          name: senderData?.name || "Usuário",
          avatar: senderData?.avatar || ""
        },
        content: messageData.content,
        image: messageData.image,
        createdAt: messageData.createdAt.toISOString(),
        read: false
      }

      if (isGroup) {
        // Para GRUPOS: emitir para todos na sala do grupo
        messageToEmit.groupId = conversation.groupId.toString()
        io.to(conversationId).emit('new_message', messageToEmit)
        console.log(`✅ Mensagem do grupo emitida para conversa ${conversationId}`)
      } else {
        // Para CONVERSAS DIRETAS: emitir para o receiver
        messageToEmit.receiver = {
          _id: messageData.receiver.toString(),
          name: "",
          avatar: ""
        }
        io.to(conversationId).emit('new_message', messageToEmit)
        console.log(`✅ Mensagem direta emitida para conversa ${conversationId}`)
      }
    }

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
