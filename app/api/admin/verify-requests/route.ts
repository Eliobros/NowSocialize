import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { isAdminAuthorized } from "@/lib/adminAuth"

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    )
  }

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
            category: 1,
            reason: 1,
            socialLinks: 1,
            personaInquiryId: 1,
            identityStatus: 1,
            verificationStatus: 1,
            submittedAt: 1,
            updatedAt: 1,
            "user.name": 1,
            "user.email": 1,
            "user.avatar": 1,
            "user.username": 1,
          },
        },
        {
          $sort: { submittedAt: -1 },
        },
      ])
      .toArray()

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Get verify requests error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

