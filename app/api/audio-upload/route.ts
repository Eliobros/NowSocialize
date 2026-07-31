import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import jwt from "jsonwebtoken"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { emitNewMessage } from "@/lib/socket-relay"

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.split(" ")[1]

  if (!token) {
    return NextResponse.json({ error: "Não autorizado: Token não fornecido." }, { status: 401 })
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error("JWT_SECRET não configurado nas variáveis de ambiente.")
    return NextResponse.json({ error: "Erro de configuração do servidor." }, { status: 500 })
  }

  let userId: string
  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    userId = decoded.userId
  } catch (error) {
    console.error("Erro ao verificar token JWT:", error)
    return NextResponse.json({ error: "Não autorizado: Token inválido ou expirado." }, { status: 401 })
  }

  try {
    const { conversationId, duration } = await req.json()

    if (!conversationId) {
      return NextResponse.json({ error: "ID da conversa é obrigatório." }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `audio/${userId}/${conversationId}/${timestamp}.webm`

    // Create presigned URL for upload
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: filename,
      ContentType: "audio/webm",
    })

    const presignedUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600, // 1 hour
    })

    // Save audio message to MongoDB
    const client = await clientPromise
    const db = client.db("socializenow")
    const messagesCollection = db.collection("messages")

    const audioMessage = {
      conversationId: new ObjectId(conversationId),
      sender: new ObjectId(userId),
      type: "audio",
      audioUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`,
      duration: duration || 0,
      createdAt: new Date(),
      read: false,
    }

    const result = await messagesCollection.insertOne(audioMessage)

    // Emitir em tempo real via Socket.IO
    const senderData = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { name: 1, avatar: 1 } }
    )
    void emitNewMessage({
      conversationId,
      senderId: userId,
      message: {
        _id: result.insertedId.toString(),
        conversationId,
        type: "audio",
        audioUrl: audioMessage.audioUrl,
        duration: duration || 0,
        content: "",
        sender: {
          _id: userId,
          name: senderData?.name,
          avatar: senderData?.avatar
        },
        createdAt: audioMessage.createdAt.toISOString(),
        read: false,
      },
    })

    // Atualizar a última mensagem da conversa
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          lastMessage: {
            content: "🎤 Mensagem de voz",
            sender: new ObjectId(userId),
            createdAt: new Date(),
          },
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      messageId: result.insertedId,
      uploadUrl: presignedUrl,
      audioUrl: audioMessage.audioUrl,
    })
  } catch (error) {
    console.error("Erro ao processar upload de áudio:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}