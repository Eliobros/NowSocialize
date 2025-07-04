import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { subject, message } = await request.json()

    if (!subject || !message) {
      return NextResponse.json({ error: "Assunto e mensagem são obrigatórios" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const supportTickets = db.collection("supportTickets")
    const users = db.collection("users")

    // Buscar dados do usuário
    const userData = await users.findOne({ _id: new ObjectId(user.userId) })
    if (!userData) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Criar ticket
    await supportTickets.insertOne({
      userId: new ObjectId(user.userId),
      name: userData.name,
      username: userData.username || userData.email.split("@")[0],
      email: userData.email,
      subject: subject.trim(),
      message: message.trim(),
      status: "open",
      createdAt: new Date(),
    })

    return NextResponse.json({ message: "Ticket criado com sucesso" })
  } catch (error) {
    console.error("Create support ticket error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
