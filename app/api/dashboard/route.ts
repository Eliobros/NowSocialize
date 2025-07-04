// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db("socializenow")

    const users = db.collection("users")
    const posts = db.collection("posts")

    const totalUsers = await users.countDocuments()
    const totalPosts = await posts.countDocuments()

    const mostFollowedUser = await users.find().sort({ followers: -1 }).limit(1).toArray()
    const mostLikedPost = await posts.find().sort({ likes: -1 }).limit(1).toArray()
    const mostCommentedPost = await posts.find().sort({ commentsCount: -1 }).limit(1).toArray()
    const mostSharedPost = await posts.find().sort({ shares: -1 }).limit(1).toArray()

    return NextResponse.json({
      totalUsers,
      totalPosts,
      mostFollowedUser: mostFollowedUser[0],
      mostLikedPost: mostLikedPost[0],
      mostCommentedPost: mostCommentedPost[0],
      mostSharedPost: mostSharedPost[0],
    })
  } catch (err) {
    console.error("Erro no dashboard:", err)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
