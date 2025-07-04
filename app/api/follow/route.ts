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

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    if (userId === user.userId) {
      return NextResponse.json({ error: "Você não pode seguir a si mesmo" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const follows = db.collection("follows")
    const users = db.collection("users")
    const notifications = db.collection("notifications")

    // Check if already following
    const existingFollow = await follows.findOne({
      followerId: new ObjectId(user.userId),
      followingId: new ObjectId(userId),
    })

    if (existingFollow) {
      return NextResponse.json({ error: "Você já segue este usuário" }, { status: 400 })
    }

    // Create follow relationship
    await follows.insertOne({
      followerId: new ObjectId(user.userId),
      followingId: new ObjectId(userId),
      createdAt: new Date(),
    })

    // Update follower and following counts
    await users.updateOne({ _id: new ObjectId(userId) }, { $inc: { followers: 1 } })
    await users.updateOne({ _id: new ObjectId(user.userId) }, { $inc: { following: 1 } })

    // Create notification
    await notifications.insertOne({
      userId: new ObjectId(userId),
      fromUserId: new ObjectId(user.userId),
      type: "follow",
      message: `${user.name} começou a seguir você`,
      read: false,
      createdAt: new Date(),
    })

    return NextResponse.json({ message: "Usuário seguido com sucesso" })
  } catch (error) {
    console.error("Follow user error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const follows = db.collection("follows")
    const users = db.collection("users")

    // Remove follow relationship
    const result = await follows.deleteOne({
      followerId: new ObjectId(user.userId),
      followingId: new ObjectId(userId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Você não segue este usuário" }, { status: 400 })
    }

    // Update follower and following counts
    await users.updateOne({ _id: new ObjectId(userId) }, { $inc: { followers: -1 } })
    await users.updateOne({ _id: new ObjectId(user.userId) }, { $inc: { following: -1 } })

    return NextResponse.json({ message: "Deixou de seguir o usuário" })
  } catch (error) {
    console.error("Unfollow user error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
