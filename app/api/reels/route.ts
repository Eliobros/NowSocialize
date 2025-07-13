import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { s3Client } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "socializenow-reels" // Nome do seu bucket S3

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
            likes: { $size: "$likes" }, // Contagem de likes
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
        { $limit: 20 }, // Limite inicial de reels
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
    const duration = Number.parseFloat(formData.get("duration") as string) // Duração em segundos

    if (!video) {
      return NextResponse.json({ error: "Vídeo é obrigatório" }, { status: 400 })
    }

    if (video.size > 50 * 1024 * 1024) {
      // Limite de 50MB
      return NextResponse.json({ error: "O vídeo deve ter no máximo 50MB" }, { status: 400 })
    }

    if (isNaN(duration) || duration <= 0 || duration > 90) {
      // Limite de 90 segundos (1m 30s)
      return NextResponse.json({ error: "Duração do vídeo inválida ou excede 1 minuto e 30 segundos" }, { status: 400 })
    }

    let videoUrl: string
    const fileExtension = video.name.split(".").pop()
    const fileName = `${user.userId}_${Date.now()}.${fileExtension}`

    try {
      const bytes = await video.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const uploadCommand = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: `reels/${fileName}`,
        Body: buffer,
        ContentType: video.type,
      })

      await s3Client.send(uploadCommand)
      videoUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/reels/${fileName}`
    } catch (error) {
      console.error("Erro no upload do vídeo para S3:", error)
      return NextResponse.json({ error: "Erro ao fazer upload do vídeo" }, { status: 500 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const reelsCollection = db.collection("reels")

    const result = await reelsCollection.insertOne({
      authorId: new ObjectId(user.userId),
      content: content.trim(),
      videoUrl: videoUrl,
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

