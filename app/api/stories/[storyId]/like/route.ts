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

export async function POST(request: NextRequest, { params }: { params: { storyId: string } }) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const stories = db.collection("stories")

    const story = await stories.findOne({ _id: new ObjectId(params.storyId) })
    if (!story) {
      return NextResponse.json({ error: "Story não encontrado" }, { status: 404 })
    }

    const userLiked = story.likes?.some((like: ObjectId) => like.equals(new ObjectId(user.userId)))

    if (userLiked) {
      // Remove like
      await stories.updateOne({ _id: new ObjectId(params.storyId) }, { $pull: { likes: new ObjectId(user.userId) } })
    } else {
      // Adiciona like
      await stories.updateOne(
        { _id: new ObjectId(params.storyId) },
        { $addToSet: { likes: new ObjectId(user.userId) } },
      )
    }

    const updatedStory = await stories.findOne({ _id: new ObjectId(params.storyId) })

    return NextResponse.json({
      liked: !userLiked,
      likes: updatedStory?.likes?.length || 0,
    })
  } catch (error) {
    console.error("Like story error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
