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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    const client = await clientPromise
    const db = client.db("socializenow")
    const users = db.collection("users")
    const follows = db.collection("follows")

    const searchQuery: any = {
      _id: { $ne: new ObjectId(user.userId) }, // Exclude current user
    }

    if (query.trim()) {
      searchQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ]
    }

    // Get users
    const usersList = await users
      .find(searchQuery, {
        projection: {
          password: 0,
        },
      })
      .limit(20)
      .toArray()

    // Get following status for each user
    const usersWithFollowStatus = await Promise.all(
      usersList.map(async (foundUser) => {
        const isFollowing = await follows.findOne({
          followerId: new ObjectId(user.userId),
          followingId: foundUser._id,
        })

        return {
          ...foundUser,
          username: foundUser.username || "",
          bio: foundUser.bio || "",
          avatar: foundUser.avatar || "",
          followers: foundUser.followers || 0,
          following: foundUser.following || 0,
          isFollowing: !!isFollowing,
        }
      }),
    )

    return NextResponse.json({ users: usersWithFollowStatus })
  } catch (error) {
    console.error("Search users error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
