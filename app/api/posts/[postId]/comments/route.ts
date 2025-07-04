import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { postId } = await params

    if (!postId || !ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "ID do post inválido" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const commentsCollection = db.collection("comments")

    const comments = await commentsCollection
      .aggregate([
        {
          $match: {
            postId: new ObjectId(postId),
          },
        },
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
          $project: {
            content: 1,
            createdAt: 1,
            "author._id": 1,
            "author.name": 1,
            "author.avatar": 1,
          },
        },
        {
          $sort: {
            createdAt: 1,
          },
        },
      ])
      .toArray()

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Erro ao buscar comentários:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const paramsData = await params
    const postId = paramsData.postId

    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { content } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Conteúdo do comentário é obrigatório" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const comments = db.collection("comments")
    const posts = db.collection("posts")
    const notifications = db.collection("notifications")
    const users = db.collection("users")

    // Verificar se o post existe
    const post = await posts.findOne({ _id: new ObjectId(postId) })
    if (!post) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 })
    }

    // Buscar dados do usuário atual
    const currentUser = await users.findOne({ _id: new ObjectId(user.userId) })
    if (!currentUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Criar comentário
    const comment = {
      postId: new ObjectId(postId),
      authorId: new ObjectId(user.userId),
      content: content.trim(),
      createdAt: new Date(),
    }

    const result = await comments.insertOne(comment)

    // Incrementar contador de comentários no post
    await posts.updateOne({ _id: new ObjectId(postId) }, { $inc: { commentsCount: 1 } })

    // Criar notificação para o autor do post (se não for o próprio usuário)
    if (post.authorId.toString() !== user.userId) {
      await notifications.insertOne({
        userId: post.authorId,
        fromUserId: new ObjectId(user.userId),
        type: "comment",
        message: `${currentUser.name} comentou no seu post`,
        postId: new ObjectId(postId),
        read: false,
        createdAt: new Date(),
      })
    }

    return NextResponse.json({
      message: "Comentário adicionado com sucesso",
      commentId: result.insertedId,
    })
  } catch (error) {
    console.error("Add comment error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
