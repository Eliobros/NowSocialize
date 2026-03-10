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

async function getOrCreateGroupSession(conversationId: string): Promise<string> {
  const client = await clientPromise
  const db = client.db("socializenow")
  const sessions = db.collection("tina_sessions")

  const existing = await sessions.findOne({ conversationId, type: "group", active: true })
  if (existing) return existing.sessionId

  const res = await fetch(`${ALAUDA_BASE}/api/tina/session/new`, {
    method: "POST",
    headers: {
      "X-API-Key": TINA_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ session_name: `group_${conversationId}` })
  })

  const data = await res.json()
  if (!data.success) throw new Error(data.error || "Erro ao criar sessão")

  const sessionId = data.data.session_id
  await sessions.insertOne({
    conversationId,
    type: "group",
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

    const { message, conversationId, senderName } = await request.json()
    if (!message || !conversationId) {
      return NextResponse.json({ error: "Mensagem e conversationId são obrigatórios" }, { status: 400 })
    }

    // Clean the @Tina mention from the message
    const cleanMessage = message.replace(/@tina/gi, "").trim()
    if (!cleanMessage) {
      return NextResponse.json({ 
        response: "Olá! 👋 Sou a Tina, a IA da SocializeNow. Como posso ajudar?" 
      })
    }

    // Add context about who is asking
    const contextMessage = senderName 
      ? `[${senderName} perguntou em um grupo]: ${cleanMessage}`
      : cleanMessage

    const sessionId = await getOrCreateGroupSession(conversationId)

    const res = await fetch(`${ALAUDA_BASE}/api/tina/chat`, {
      method: "POST",
      headers: {
        "X-API-Key": TINA_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ session_id: sessionId, message: contextMessage })
    })

    const data = await res.json()

    if (!data.success) {
      // Reset session and retry
      const client = await clientPromise
      const db = client.db("socializenow")
      await db.collection("tina_sessions").updateOne(
        { conversationId, type: "group", active: true },
        { $set: { active: false } }
      )
      const newSessionId = await getOrCreateGroupSession(conversationId)
      const retryRes = await fetch(`${ALAUDA_BASE}/api/tina/chat`, {
        method: "POST",
        headers: {
          "X-API-Key": TINA_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ session_id: newSessionId, message: contextMessage })
      })
      const retryData = await retryRes.json()
      if (!retryData.success) {
        return NextResponse.json({ error: "Tina está indisponível" }, { status: 503 })
      }
      return NextResponse.json({ response: retryData.data.message })
    }

    return NextResponse.json({ response: data.data.message })
  } catch (error: any) {
    console.error("Tina group error:", error)
    return NextResponse.json({ error: "Tina está temporariamente indisponível" }, { status: 503 })
  }
}
