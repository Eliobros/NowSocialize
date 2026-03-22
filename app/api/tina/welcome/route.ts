import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

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

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")

    const userData = await db.collection("users").findOne(
      { _id: new ObjectId(user.userId) },
      { projection: { name: 1, interests: 1, tinaWelcomeSent: 1 } }
    )

    if (!userData) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Only send welcome once
    if (userData.tinaWelcomeSent) {
      return NextResponse.json({ alreadySent: true })
    }

    const interests = userData.interests || []
    const name = userData.name || user.name

    let message: string
    if (interests.length > 0) {
      const interestsList = interests.slice(0, 3).join(", ")
      message = `Olá ${name}! 👋 Bem-vindo(a) à SocializeNow! 🎉\n\nVi que você tem interesse em ${interestsList}. Que tal eu te sugerir um texto para seu primeiro post? Basta digitar "@Tina sugere me um texto sobre [assunto]" na caixa de criar post! 💡`
    } else {
      message = `Olá ${name}! 👋 Bem-vindo(a) à SocializeNow! 🎉\n\nSou a Tina, sua assistente de IA. Posso te ajudar a criar posts incríveis! Basta digitar "@Tina sugere me um texto sobre [assunto]" na caixa de criar post. 💡`
    }

    // Mark welcome as sent
    await db.collection("users").updateOne(
      { _id: new ObjectId(user.userId) },
      { $set: { tinaWelcomeSent: true } }
    )

    return NextResponse.json({ message, interests })
  } catch (error: any) {
    console.error("Tina welcome error:", error)
    return NextResponse.json({ error: "Erro ao gerar boas-vindas" }, { status: 500 })
  }
}
