import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("socializenow")
    const verifyRequests = db.collection("verifyRequests")

    const requests = await verifyRequests
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            fullName: 1,
            birthDate: 1,
            documentFront: 1,
            documentBack: 1,
            reason: 1,
            status: 1,
            createdAt: 1,
            "user.name": 1,
            "user.email": 1,
            "user.avatar": 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray()

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Get verify requests error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
