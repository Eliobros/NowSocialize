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
    const notifications = db.collection("notifications")

    // Get user notifications with sender information
    const userNotifications = await notifications
      .aggregate([
        { $match: { userId: new ObjectId(user.userId) } },
        {
          $lookup: {
            from: "users",
            localField: "fromUserId",
            foreignField: "_id",
            as: "from",
          },
        },
        {
          $addFields: {
            from: {
              $cond: {
                if: { $gt: [{ $size: "$from" }, 0] },
                then: { $arrayElemAt: ["$from", 0] },
                else: {
                  name: "SocializeNow",
                  username: "system",
                  avatar: "",
                },
              },
            },
          },
        },
        {
          $project: {
            type: 1,
            message: 1,
            read: 1,
            createdAt: 1,
            postId: 1,
            "from.name": 1,
            "from.username": 1,
            "from.avatar": 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
      ])
      .toArray()

    return NextResponse.json({ notifications: userNotifications })
  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
