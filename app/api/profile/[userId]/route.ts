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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { userId } = await params
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID do usuário inválido" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const users = db.collection("users")
    const profiles = db.collection("profiles")
    const follows = db.collection("follows")
    const posts = db.collection("posts")

    const targetUserId = new ObjectId(userId)
    const currentUserId = new ObjectId(user.userId)

    // Get user basic info
    const targetUser = await users.findOne({ _id: targetUserId }, { projection: { password: 0 } })
    if (!targetUser) {
      console.error(`Usuário não encontrado com ID: ${userId}`)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Get profile info (pode não existir para todos os usuários)
    const profileInfo = await profiles.findOne({ userId: targetUserId })

    // Count followers and following
    const followersCount = await follows.countDocuments({ followingId: targetUserId })
    const followingCount = await follows.countDocuments({ followerId: targetUserId })

    // Count posts
    const postsCount = await posts.countDocuments({ authorId: targetUserId })

    // Check if current user is following this user
    const isFollowing = await follows.findOne({
      followerId: currentUserId,
      followingId: targetUserId,
    })

    const profile = {
      _id: targetUser._id,
      name: targetUser.name,
      username: profileInfo?.username || targetUser.username || targetUser.email.split("@")[0],
      email: targetUser.email,
      bio: profileInfo?.bio || targetUser.bio || "",
      avatar: profileInfo?.avatar || targetUser.avatar || "",
      followers: followersCount,
      following: followingCount,
      postsCount: postsCount,
      isFollowing: !!isFollowing,
      isVerified: targetUser.isVerified || false,
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Get user profile error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
