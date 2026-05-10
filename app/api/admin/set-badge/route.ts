import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { isAdminAuthorized } from "@/lib/adminAuth"

const VALID_BADGES = ["verificado", "dev", "dev_sn", "empresa", "dono"]

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const { userId, badgeType } = await request.json()

    if (!VALID_BADGES.includes(badgeType)) {
      return NextResponse.json(
        { error: "Tipo de selo inválido" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("socializenow")

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isVerified: true, badgeType } }
    )

    return NextResponse.json({ 
      message: `Selo "${badgeType}" atribuído com sucesso` 
    })

  } catch (error) {
    console.error("Set badge error:", error)
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}
