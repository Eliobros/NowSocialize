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
// IMPORTANTE: o upload do vídeo para o Cloudinary agora acontece NO FRONTEND,
// direto do navegador do usuário. Esta rota só recebe a URL final (texto leve)
// e salva no banco. Isso evita o limite de 4.5MB de body das serverless
// functions do Vercel, que causava o erro 413.
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const body = await request.json()
    const content = (body.content as string) || ""
    const videoUrl = body.videoUrl as string
    const publicId = body.publicId as string
    const duration = Number.parseFloat(body.duration)

    if (!videoUrl || !publicId) {
      return NextResponse.json({ error: "Vídeo é obrigatório" }, { status: 400 })
    }

    if (isNaN(duration) || duration <= 0 || duration > 90) {
      return NextResponse.json(
        { error: "Duração do vídeo inválida ou excede 1 minuto e 30 segundos" },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const reelsCollection = db.collection("reels")

    const result = await reelsCollection.insertOne({
      authorId: new ObjectId(user.userId),
      content: content.trim(),
      videoUrl: videoUrl,
      publicId: publicId,
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

// DELETE - Deletar reel
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

    const reel = await reelsCollection.findOne({ _id: new ObjectId(reelId) })

    if (!reel) {
      return NextResponse.json({ error: "Reel não encontrado" }, { status: 404 })
    }

    if (reel.authorId.toString() !== user.userId) {
      return NextResponse.json({ error: "Sem permissão para deletar este reel" }, { status: 403 })
    }

    if (reel.publicId) {
      try {
        await cloudinary.uploader.destroy(reel.publicId, { resource_type: "video" })
      } catch (error) {
        console.error("Erro ao deletar vídeo do Cloudinary:", error)
      }
    }

    await reelsCollection.deleteOne({ _id: new ObjectId(reelId) })

    return NextResponse.json({ message: "Reel deletado com sucesso" })
  } catch (error) {
    console.error("Delete reel error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
