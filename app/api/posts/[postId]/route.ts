// app/api/posts/[postId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // ← ADICIONA ESTA LINHA!
    const { postId } = await params
    
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const userId = decoded.userId || decoded.id || decoded._id

    const client = await clientPromise
    const db = client.db("socializenow")
    const posts = db.collection("posts")
    const users = db.collection("users")

    // Buscar o post - AGORA USA postId AO INVÉS DE params.postId
    const post = await posts.findOne({ _id: new ObjectId(postId) })

    if (!post) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 })
    }

    // Buscar informações do autor
    const author = await users.findOne(
      { _id: new ObjectId(post.userId) },
      { projection: { name: 1, email: 1, avatar: 1, isVerified: 1 } }
    )

    if (!author) {
      return NextResponse.json({ error: "Autor não encontrado" }, { status: 404 })
    }

    // Verificar se o usuário atual curtiu o post
    const likedByUser = post.likes?.some((id: ObjectId) => id.toString() === userId)

    // Contar comentários - USA postId AQUI TAMBÉM
    const comments = db.collection("comments")
    const commentsCount = await comments.countDocuments({ postId: new ObjectId(postId) })

    const formattedPost = {
      _id: post._id.toString(),
      content: post.content,
      image: post.image,
      author: {
        _id: author._id.toString(),
        name: author.name,
        email: author.email,
        avatar: author.avatar,
        isVerified: author.isVerified || false,
      },
      createdAt: post.createdAt,
      likes: post.likes?.length || 0,
      likedByUser,
      commentsCount,
    }

    return NextResponse.json({ post: formattedPost })
  } catch (error) {
    console.error("Erro ao buscar post:", error)
    return NextResponse.json({ error: "Erro ao buscar post" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // ← ADICIONA ESTA LINHA AQUI TAMBÉM!
    const { postId } = await params
    
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const userId = decoded.userId || decoded.id || decoded._id

    const client = await clientPromise
    const db = client.db("socializenow")
    const posts = db.collection("posts")

    // Verificar se o post existe e se pertence ao usuário - USA postId
    const post = await posts.findOne({ _id: new ObjectId(postId) })

    if (!post) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 })
    }

    if (post.userId.toString() !== userId) {
      return NextResponse.json({ error: "Sem permissão para deletar este post" }, { status: 403 })
    }

    // Deletar o post - USA postId
    await posts.deleteOne({ _id: new ObjectId(postId) })

    // Opcional: deletar comentários e notificações relacionadas - USA postId
    const comments = db.collection("comments")
    await comments.deleteMany({ postId: new ObjectId(postId) })

    return NextResponse.json({ message: "Post deletado com sucesso" })
  } catch (error) {
    console.error("Erro ao deletar post:", error)
    return NextResponse.json({ error: "Erro ao deletar post" }, { status: 500 })
  }
}
