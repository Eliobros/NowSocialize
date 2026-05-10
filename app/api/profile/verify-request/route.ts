import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const PERSONA_API_KEY = process.env.PERSONA_API_KEY!
const PERSONA_TEMPLATE_ID = process.env.PERSONA_TEMPLATE_ID!

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  try {
    return jwt.verify(authHeader.substring(7), JWT_SECRET) as any
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const verifyRequests = db.collection("verifyRequests")
    const notifications = db.collection("notifications")

    // Verificar se já existe solicitação pendente
    const existingRequest = await verifyRequests.findOne({
      userId: new ObjectId(user.userId),
      status: { $in: ["pending", "processing"] },
    })

    if (existingRequest) {
      return NextResponse.json({ error: "Você já possui uma solicitação pendente" }, { status: 400 })
    }

    // Criar Inquiry no Persona
    const personaResponse = await fetch("https://api.withpersona.com/api/v1/inquiries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERSONA_API_KEY}`,
        "Persona-Version": "2023-01-05",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            "inquiry-template-id": PERSONA_TEMPLATE_ID,
            "reference-id": user.userId, // liga o inquiry ao teu user
            fields: {
              "email-address": user.email || null,
            }
          }
        }
      })
    })

    if (!personaResponse.ok) {
      const err = await personaResponse.json()
      console.error("Persona error:", err)
      return NextResponse.json({ error: "Erro ao iniciar verificação" }, { status: 500 })
    }

    const personaData = await personaResponse.json()
    const inquiryId = personaData.data.id

    // Criar session para o usuário completar a verificação
    const sessionResponse = await fetch(`https://api.withpersona.com/api/v1/inquiries/${inquiryId}/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERSONA_API_KEY}`,
        "Persona-Version": "2023-01-05",
      }
    })

    const sessionData = await sessionResponse.json()
    const sessionToken = sessionData.data?.attributes?.["session-token"]

    // Salvar no MongoDB com status processing
    await verifyRequests.insertOne({
      userId: new ObjectId(user.userId),
      inquiryId,
      status: "processing",
      createdAt: new Date(),
    })

    // Notificar o usuário
    await notifications.insertOne({
      userId: new ObjectId(user.userId),
      type: "verification_request",
      message: "Verificação iniciada! Complete o processo clicando no link enviado.",
      read: false,
      createdAt: new Date(),
    })

    // Retorna a URL do Persona para o frontend redirecionar
    return NextResponse.json({
      message: "Verificação iniciada",
      sessionToken,
      verificationUrl: `https://withpersona.com/verify?inquiry-id=${inquiryId}&session-token=${sessionToken}`
    })

  } catch (error) {
    console.error("Verify request error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
