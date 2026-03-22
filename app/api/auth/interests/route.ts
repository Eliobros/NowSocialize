import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

const AVAILABLE_INTERESTS = [
  "Tecnologia",
  "Música",
  "Esportes",
  "Filmes & Séries",
  "Games",
  "Culinária",
  "Viagens",
  "Fotografia",
  "Moda",
  "Arte & Design",
  "Ciência",
  "Educação",
  "Negócios",
  "Saúde & Fitness",
  "Livros",
  "Humor",
  "Política",
  "Natureza",
  "Programação",
  "Empreendedorismo",
]

export async function GET() {
  return NextResponse.json({ interests: AVAILABLE_INTERESTS })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let user: any
    try {
      user = jwt.verify(token, JWT_SECRET) as any
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { interests } = await request.json()

    if (!Array.isArray(interests)) {
      return NextResponse.json({ error: "Interesses devem ser um array" }, { status: 400 })
    }

    // Validate that all interests are from the available list
    const validInterests = interests.filter((i: string) => AVAILABLE_INTERESTS.includes(i))

    const client = await clientPromise
    const db = client.db("socializenow")

    await db.collection("users").updateOne(
      { _id: new ObjectId(user.userId) },
      { $set: { interests: validInterests, interestsSelectedAt: new Date() } }
    )

    return NextResponse.json({
      message: "Interesses salvos com sucesso",
      interests: validInterests,
    })
  } catch (error: any) {
    console.error("Save interests error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
