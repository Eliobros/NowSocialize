import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import jwt from "jsonwebtoken"

interface UserDocument {
  _id: ObjectId
  name: string
  email: string
  username: string
  userEmailVerified: boolean // CORRETO: campo que armazena status da verificação
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.split(" ")[1]

  if (!token) {
    return NextResponse.json({ error: "Não autorizado: Token não fornecido." }, { status: 401 })
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error("JWT_SECRET não configurado nas variáveis de ambiente.")
    return NextResponse.json({ error: "Erro de configuração do servidor." }, { status: 500 })
  }

  let userId: string
  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    userId = decoded.userId
  } catch (error) {
    console.error("Erro ao verificar token JWT:", error)
    return NextResponse.json({ error: "Não autorizado: Token inválido ou expirado." }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db("socializenow")
    const usersCollection = db.collection<UserDocument>("users")

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      username: user.username,
      userEmailVerified: user.userEmailVerified ?? false,
    })
  } catch (error) {
    console.error("Erro ao buscar usuário no MongoDB:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}