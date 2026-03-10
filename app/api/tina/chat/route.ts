import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const TINA_API_KEY = process.env.TINA_API_KEY || ""
const ALAUDA_BASE = "https://alauda-api.topazioverse.com.br"

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  const token = authHeader.substring(7)
  try { return jwt.verify(token, JWT_SECRET) as any } catch { return null }
}

async function getOrCreateSession(userId: string): Promise<string> {
  const client = await clientPromise
  const db = client.db("socializenow")
  const sessions = db.collection("tina_sessions")

  // Check existing session
  const existing = await sessions.findOne({ userId, active: true })
  if (existing) return existing.sessionId

  // Create new session via Alauda API
  const res = await fetch(`${ALAUDA_BASE}/api/tina/session/new`, {
    method: "POST",
    headers: {
      "X-API-Key": TINA_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ session_name: `socializenow_${userId}` })
  })

  const data = await res.json()
  if (!data.success) throw new Error(data.error || "Erro ao criar sessão")

  const sessionId = data.data.session_id
  await sessions.insertOne({
    userId,
    sessionId,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  return sessionId
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { message } = await request.json()
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 })
    }

    // Get or create Tina session for this user
    const sessionId = await getOrCreateSession(user.userId)

    // Send to Tina via Alauda API
    const res = await fetch(`${ALAUDA_BASE}/api/tina/chat`, {
      method: "POST",
      headers: {
        "X-API-Key": TINA_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ session_id: sessionId, message: message.trim() })
    })

    const data = await res.json()

    if (!data.success) {
      // If session expired, reset and retry once
      if (data.error?.includes("sessão") || data.error?.includes("session")) {
        const client = await clientPromise
        const db = client.db("socializenow")
        await db.collection("tina_sessions").updateOne(
          { userId: user.userId, active: true },
          { $set: { active: false } }
        )
        const newSessionId = await getOrCreateSession(user.userId)
        const retryRes = await fetch(`${ALAUDA_BASE}/api/tina/chat`, {
          method: "POST",
          headers: {
            "X-API-Key": TINA_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ session_id: newSessionId, message: message.trim() })
        })
        const retryData = await retryRes.json()
        if (!retryData.success) {
          return NextResponse.json({ error: retryData.error || "Tina está indisponível" }, { status: 503 })
        }
        return NextResponse.json({
          response: retryData.data.message,
          model: retryData.data.model
        })
      }
      return NextResponse.json({ error: data.error || "Erro na Tina" }, { status: 500 })
    }

    return NextResponse.json({
      response: data.data.message,
      model: data.data.model
    })
  } catch (error: any) {
    console.error("Tina chat error:", error)
    return NextResponse.json({ error: "Tina está temporariamente indisponível" }, { status: 503 })
  }
}
