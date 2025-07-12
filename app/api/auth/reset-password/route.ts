// app/api/auth/reset-password/route.ts
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { hash } from "bcrypt"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "secret"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, senha } = body

    if (!token || !senha) {
      return NextResponse.json({ message: "Dados incompletos." }, { status: 400 })
    }

    // Verificar e decodificar token
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch (err) {
      return NextResponse.json({ message: "Token inválido ou expirado." }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    const users = db.collection("users")

    const userId = new ObjectId(decoded.userId)
    const newPasswordHash = await hash(senha, 10)

    const result = await users.updateOne(
      { _id: userId },
      { $set: { password: newPasswordHash } },
    )

    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: "Não foi possível atualizar a senha." }, { status: 400 })
    }

    return NextResponse.json({ message: "Senha atualizada com sucesso." }, { status: 200 })
  } catch (err) {
    console.error("Erro ao redefinir senha:", err)
    return NextResponse.json({ message: "Erro no servidor." }, { status: 500 })
  }
}
