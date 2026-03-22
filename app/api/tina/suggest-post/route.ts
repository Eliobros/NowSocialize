import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { GoogleGenerativeAI } from "@google/generative-ai"

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

    const { assunto } = await request.json()
    if (!assunto || !assunto.trim()) {
      return NextResponse.json({ error: "Assunto é obrigatório" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "IA não configurada" }, { status: 503 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `Você é a Tina, assistente da rede social SocializeNow. O usuário "${user.name}" pediu uma sugestão de texto para um post. Gere APENAS o texto do post, sem explicações ou comentários extras. O texto deve ser natural, envolvente e adequado para uma rede social. Máximo de 500 caracteres. Use emojis moderadamente.`,
    })

    const result = await model.generateContent(
      `Sugira um texto de post sobre: ${assunto.trim()}`
    )
    const suggestion = result.response.text()

    return NextResponse.json({ suggestion })
  } catch (error: any) {
    console.error("Tina suggest-post error:", error)
    return NextResponse.json({ error: "Erro ao gerar sugestão" }, { status: 500 })
  }
}
