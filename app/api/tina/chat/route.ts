import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { tinaChat, resetTinaChat } from "@/lib/tina/tinaService"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET) as any
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

    const { message } = await request.json()
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 })
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: "Mensagem muito longa (máximo 5000 caracteres)" }, { status: 400 })
    }

    const result = await tinaChat(user.userId, message.trim(), {
      userId: user.userId,
      username: user.username,
      email: user.email,
      name: user.name,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Tina está indisponível" }, { status: 503 })
    }

    return NextResponse.json({
      response: result.response,
      functionCalls: result.functionCalls,
    })
  } catch (error: any) {
    console.error("Tina chat error:", error)
    return NextResponse.json({ error: "Tina está temporariamente indisponível" }, { status: 503 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    resetTinaChat(user.userId)
    return NextResponse.json({ success: true, message: "Conversa resetada" })
  } catch {
    return NextResponse.json({ error: "Erro ao resetar conversa" }, { status: 500 })
  }
}
