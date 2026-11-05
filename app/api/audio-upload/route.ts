import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { emitNewMessage } from "@/lib/socket-relay"
import { supabase } from "@/lib/supabase"

// Nome do bucket configurado no painel do Supabase
const BUCKET_NAME = "audios_socializenow"

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
    const formData = await req.formData()
    const file = formData.get("file") as Blob | null
    const conversationId = formData.get("conversationId") as string | null
    const durationStr = formData.get("duration") as string | null
    const duration = durationStr ? parseInt(durationStr, 10) : 0

    if (!conversationId) {
      return NextResponse.json({ error: "ID da conversa é obrigatório." }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: "Arquivo de áudio não fornecido." }, { status: 400 })
    }

    // Gerar estrutura de pastas única no bucket: usuario/conversa/timestamp.webm
    const timestamp = Date.now()
    const filename = `${userId}/${conversationId}/${timestamp}.webm`

    // Converter Blob para Buffer para processamento correto no backend
    const buffer = Buffer.from(await file.arrayBuffer())

    // Envia o arquivo para o Supabase Storage usando o cliente centralizado
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: "audio/webm",
        upsert: true
      })

    if (uploadError) {
      console.error("Erro no upload do Supabase:", uploadError)
      return NextResponse.json({ error: "Falha ao salvar áudio no storage." }, { status: 500 })
    }

    // Resgata a URL pública gerada para salvar no banco
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename)

    // Conectar ao MongoDB para salvar o registro da mensagem
    const client = await clientPromise
    const db = client.db("socializenow")
    const messagesCollection = db.collection("messages")

    const audioMessage = {
      conversationId: new ObjectId(conversationId),
      sender: new ObjectId(userId),
      type: "audio",
      audioUrl: publicUrl,
      duration: duration || 0,
      createdAt: new Date(),
      read: false,
    }

    const result = await messagesCollection.insertOne(audioMessage)

    // Buscar dados do remetente para o payload do WebSocket
    const senderData = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { name: 1, avatar: 1 } }
    )
    
    // Emitir o evento de mensagem em tempo real
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

    // Atualizar os metadados da última mensagem da conversa
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
      audioUrl: publicUrl,
    })
  } catch (error) {
    console.error("Erro ao processar upload de áudio:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
