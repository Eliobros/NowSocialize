import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { isAdminAuthorized } from "@/lib/adminAuth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    )
  }

  try {
    const { action, reason, badgeType } = await request.json()
    const { requestId } = await params

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const verifyRequests = db.collection("verifyRequests")
    const users = db.collection("users")
    const notifications = db.collection("notifications")
    const systemMessages = db.collection("systemMessages")

    const verifyRequest = await verifyRequests.findOne({ _id: new ObjectId(requestId) })
    if (!verifyRequest) {
      return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 })
    }

    await verifyRequests.updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          verificationStatus: action === "approve" ? "approved" : "rejected",
          rejectReason: action === "reject" ? reason : null,
          badgeType: action === "approve" ? (badgeType || "verificado") : null,
          updatedAt: new Date(),
        },
      }
    )

    if (action === "approve") {
      await users.updateOne(
        { _id: verifyRequest.userId },
        { $set: { isVerified: true, badgeType: badgeType || "verificado" } }
      )
    }

    const message = action === "approve"
      ? "Parabéns! 🎉 A Equipe da SocializeNow aprovou seu pedido para obtenção do selo. Verifique seu perfil!"
      : `Sua solicitação de selo foi recusada. Motivo: ${reason || "Não especificado"}. Você pode tentar novamente.`

    await notifications.insertOne({
      userId: verifyRequest.userId,
      type: "verification",
      message,
      read: false,
      createdAt: new Date(),
    })

    await systemMessages.insertOne({
      userId: verifyRequest.userId,
      content: message,
      createdAt: new Date(),
      read: false,
    })

    return NextResponse.json({ message: "Solicitação processada com sucesso" })
  } catch (error) {
    console.error("Process verify request error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
