import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import crypto from "crypto"

const PERSONA_WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET!

function verifyPersonaSignature(payload: string, headers: Headers): boolean {
  try {
    const signatureHeader = headers.get("persona-signature")
    if (!signatureHeader) return false

    // Persona envia: t=timestamp,v1=signature
    const parts = signatureHeader.split(",")
    const timestamp = parts.find(p => p.startsWith("t="))?.split("=")[1]
    const signature = parts.find(p => p.startsWith("v1="))?.split("=")[1]

    if (!timestamp || !signature) return false

    // Verificar se o timestamp não é muito antigo (5 minutos)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - parseInt(timestamp)) > 300) return false

    // Computar a assinatura esperada
    const signedPayload = `${timestamp}.${payload}`
    const expectedSignature = crypto
      .createHmac("sha256", PERSONA_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest("hex")

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // Validar assinatura
    const isValid = verifyPersonaSignature(rawBody, request.headers)
    if (!isValid) {
      console.error("Persona webhook: assinatura inválida")
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)

    const eventName = body?.data?.attributes?.name
    const inquiryId = body?.data?.attributes?.payload?.data?.id
    const status = body?.data?.attributes?.payload?.data?.attributes?.status
    const referenceId = body?.data?.attributes?.payload?.data?.attributes?.["reference-id"]

    if (!inquiryId || !referenceId) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const verifyRequests = db.collection("verifyRequests")
    const users = db.collection("users")
    const notifications = db.collection("notifications")

    if (eventName === "inquiry.approved" || status === "approved") {
      await verifyRequests.updateOne(
        { inquiryId },
        { $set: { status: "approved", updatedAt: new Date() } }
      )

      await users.updateOne(
        { _id: new ObjectId(referenceId) },
        { $set: { isVerified: true, verifiedAt: new Date() } }
      )

      await notifications.insertOne({
        userId: new ObjectId(referenceId),
        type: "verification_approved",
        message: "🎉 Parabéns! Seu perfil foi verificado com sucesso. O selo já aparece no seu perfil!",
        read: false,
        createdAt: new Date(),
      })

    } else if (eventName === "inquiry.declined" || status === "declined") {
      const declineReason = body?.data?.attributes?.payload?.data?.attributes?.["reviewer-comment"] || "Documento não pôde ser verificado"

      await verifyRequests.updateOne(
        { inquiryId },
        { $set: { status: "declined", reason: declineReason, updatedAt: new Date() } }
      )

      await notifications.insertOne({
        userId: new ObjectId(referenceId),
        type: "verification_declined",
        message: `❌ Sua solicitação de verificação foi recusada. Motivo: ${declineReason}`,
        read: false,
        createdAt: new Date(),
      })
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error("Persona webhook error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
