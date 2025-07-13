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

export async function POST(request: NextRequest, { params }: { params: { reelId: string } }) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const reelsCollection = db.collection("reels")

    const reel = await reelsCollection.findOne({ _id: new ObjectId(params.reelId) })
    if (!reel) {
      return NextResponse.json({ error: "Reel não encontrado" }, { status: 404 })
    }

    const userLiked = reel.likes?.some((like: ObjectId) => like.equals(new ObjectId(user.userId)))

    if (userLiked) {
      // Remove like
      await reelsCollection.updateOne(
        { _id: new ObjectId(params.reelId) },
        { $pull: { likes: new ObjectId(user.userId) } },
      )
    } else {
      // Adiciona like
      await reelsCollection.updateOne(
        { _id: new ObjectId(params.reelId) },
        { $addToSet: { likes: new ObjectId(user.userId) } },
      )
    }

    const updatedReel = await reelsCollection.findOne({ _id: new ObjectId(params.reelId) })

    return NextResponse.json({
      liked: !userLiked,
      likes: updatedReel?.likes?.length || 0,
    })
  } catch (error) {
    console.error("Like reel error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

