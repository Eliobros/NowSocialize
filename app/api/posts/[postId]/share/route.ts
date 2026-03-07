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

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { postId } = await params
    if (!ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "ID do post inválido" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const posts = db.collection("posts")
    const notifications = db.collection("notifications")
    const users = db.collection("users")

    // Check original post exists
    const originalPost = await posts.findOne({ _id: new ObjectId(postId) })
    if (!originalPost) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 })
    }

    // Get current user info
    const currentUser = await users.findOne({ _id: new ObjectId(user.userId) })
    if (!currentUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Optional content from body
    let shareContent = ""
    try {
      const body = await request.json()
      shareContent = body.content || ""
    } catch {}

    // Create the shared post
    const sharedPost = {
      authorId: new ObjectId(user.userId),
      content: shareContent.trim(),
      sharedPostId: new ObjectId(postId),
      createdAt: new Date(),
      likes: 0,
      commentsCount: 0,
    }

    const result = await posts.insertOne(sharedPost)

    // Increment share count on original post
    await posts.updateOne(
      { _id: new ObjectId(postId) },
      { $inc: { sharesCount: 1 } }
    )

    // Notify original post author (if not self)
    if (originalPost.authorId.toString() !== user.userId) {
      await notifications.insertOne({
        userId: originalPost.authorId,
        fromUserId: new ObjectId(user.userId),
        type: "share",
        message: `${currentUser.name} compartilhou seu post`,
        postId: new ObjectId(postId),
        read: false,
        createdAt: new Date(),
      })
    }

    return NextResponse.json({
      message: "Post compartilhado com sucesso",
      postId: result.insertedId,
    })
  } catch (error) {
    console.error("Share post error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
