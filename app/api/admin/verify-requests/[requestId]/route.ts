import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

export async function PUT(request: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    const { action } = await request.json()
    const { requestId } = params

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const verifyRequests = db.collection("verifyRequests")
    const users = db.collection("users")
    const notifications = db.collection("notifications")

    // Buscar a solicitação
    const verifyRequest = await verifyRequests.findOne({ _id: new ObjectId(requestId) })
    if (!verifyRequest) {
      return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 })
    }

    // Atualizar status da solicitação
    await verifyRequests.updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: action === "approve" ? "approved" : "rejected",
          updatedAt: new Date(),
        },
      },
    )

    // Se aprovado, marcar usuário como verificado
    if (action === "approve") {
      await users.updateOne({ _id: verifyRequest.userId }, { $set: { isVerified: true } })
    }

    // Criar notificação para o usuário
    const message =
      action === "approve"
        ? "Parabéns! A Equipe da SocializeNow aprovou seu pedido para obtenção do selo. Verifique seu perfil, caso não apareça contate a equipe da SocializeNow."
        : "Sua solicitação de selo de verificação foi rejeitada. Entre em contato com o suporte para mais informações."

    await notifications.insertOne({
      userId: verifyRequest.userId,
      type: "verification",
      message,
      read: false,
      createdAt: new Date(),
    })

    return NextResponse.json({ message: "Solicitação processada com sucesso" })
  } catch (error) {
    console.error("Process verify request error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
