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

// GET - Buscar reels
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const reelsCollection = db.collection("reels")

    const reels = await reelsCollection
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "authorId",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $unwind: "$author",
        },
        {
          $addFields: {
            likedByUser: { $in: [new ObjectId(user.userId), "$likes"] },
            viewedByUser: { $in: [new ObjectId(user.userId), "$views"] },
          },
        },
        {
          $project: {
            _id: 1,
            videoUrl: 1,
            content: 1,
            createdAt: 1,
            duration: 1,
            likes: { $size: "$likes" },
            commentsCount: 1,
            likedByUser: 1,
            viewedByUser: 1,
            "author._id": 1,
            "author.name": 1,
            "author.username": 1,
            "author.avatar": 1,
            "author.isVerified": 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
      ])
      .toArray()

    return NextResponse.json({ reels })
  } catch (error) {
    console.error("Get reels error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST - Criar novo reel
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const formData = await request.formData()
    const content = (formData.get("content") as string) || ""
    const video = formData.get("video") as File
    const duration = Number.parseFloat(formData.get("duration") as string)

    if (!video) {
      return NextResponse.json({ error: "Vídeo é obrigatório" }, { status: 400 })
    }

    if (video.size > 100 * 1024 * 1024) {
      // Cloudinary free tier suporta até 100MB
      return NextResponse.json({ error: "O vídeo deve ter no máximo 100MB" }, { status: 400 })
    }

    if (isNaN(duration) || duration <= 0 || duration > 90) {
      return NextResponse.json({ error: "Duração do vídeo inválida ou excede 1 minuto e 30 segundos" }, { status: 400 })
    }

    let videoUrl: string
    let publicId: string

    try {
      // Converte o arquivo para base64
      const bytes = await video.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64Video = `data:${video.type};base64,${buffer.toString('base64')}`

      // Upload para o Cloudinary
      const uploadResult = await cloudinary.uploader.upload(base64Video, {
        resource_type: 'video',
        folder: 'reels', // Organiza em pasta
        public_id: `${user.userId}_${Date.now()}`, // Nome único
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }, // Otimização automática
        ],
        // Opções adicionais para melhor performance
        eager: [
          { streaming_profile: 'hd', format: 'm3u8' }, // Streaming adaptativo
        ],
        eager_async: true, // Processa em background
      })

      videoUrl = uploadResult.secure_url
      publicId = uploadResult.public_id

      console.log('Upload bem-sucedido:', {
        url: videoUrl,
        publicId: publicId,
        format: uploadResult.format,
        duration: uploadResult.duration,
      })
    } catch (error) {
      console.error("Erro no upload do vídeo para Cloudinary:", error)
      return NextResponse.json({ error: "Erro ao fazer upload do vídeo" }, { status: 500 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const reelsCollection = db.collection("reels")

    const result = await reelsCollection.insertOne({
      authorId: new ObjectId(user.userId),
      content: content.trim(),
      videoUrl: videoUrl,
      publicId: publicId, // Salva o publicId para deletar depois se necessário
      duration: duration,
      views: [],
      likes: [],
      commentsCount: 0,
      createdAt: new Date(),
    })

    return NextResponse.json({
      message: "Reel criado com sucesso",
      reelId: result.insertedId,
    })
  } catch (error) {
    console.error("Create reel error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// DELETE - Deletar reel (opcional, mas útil)
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reelId = searchParams.get("id")

    if (!reelId) {
      return NextResponse.json({ error: "ID do reel é obrigatório" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const reelsCollection = db.collection("reels")

    // Busca o reel para verificar permissão e obter publicId
    const reel = await reelsCollection.findOne({ _id: new ObjectId(reelId) })

    if (!reel) {
      return NextResponse.json({ error: "Reel não encontrado" }, { status: 404 })
    }

    if (reel.authorId.toString() !== user.userId) {
      return NextResponse.json({ error: "Sem permissão para deletar este reel" }, { status: 403 })
    }

    // Deleta o vídeo do Cloudinary
    if (reel.publicId) {
      try {
        await cloudinary.uploader.destroy(reel.publicId, { resource_type: 'video' })
      } catch (error) {
        console.error("Erro ao deletar vídeo do Cloudinary:", error)
      }
    }

    // Deleta o reel do banco
    await reelsCollection.deleteOne({ _id: new ObjectId(reelId) })

    return NextResponse.json({ message: "Reel deletado com sucesso" })
  } catch (error) {
    console.error("Delete reel error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
