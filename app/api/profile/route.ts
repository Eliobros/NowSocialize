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

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const users = db.collection("users")
    const posts = db.collection("posts")

    // Get user profile
    const userProfile = await users.findOne({ _id: new ObjectId(user.userId) }, { projection: { password: 0 } })

    if (!userProfile) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Count user posts
    const postsCount = await posts.countDocuments({ authorId: new ObjectId(user.userId) })

    const profile = {
      ...userProfile,
      username: userProfile.username || "",
      bio: userProfile.bio || "",
      avatar: userProfile.avatar || "",
      followers: userProfile.followers || 0,
      following: userProfile.following || 0,
      isVerified: userProfile.isVerified || false,
      postsCount,
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { name, username, bio, avatar } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const users = db.collection("users")

    // Check if username is already taken (if provided)
    if (username) {
      const existingUser = await users.findOne({
        username,
        _id: { $ne: new ObjectId(user.userId) },
      })
      if (existingUser) {
        return NextResponse.json({ error: "Nome de usuário já está em uso" }, { status: 400 })
      }
    }

    const updateData: any = {
      name,
      bio: bio || "",
      avatar: avatar || "",
      updatedAt: new Date(),
    }

    if (username) {
      updateData.username = username
    }

    await users.updateOne({ _id: new ObjectId(user.userId) }, { $set: updateData })

    return NextResponse.json({ message: "Perfil atualizado com sucesso" })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
