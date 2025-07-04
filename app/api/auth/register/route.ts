import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  try {
    const { name, email, username, password } = await request.json()

    if (!name || !email || !username || !password) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const users = db.collection("users")

    // Verificar se já existe usuário com o mesmo e-mail ou username
    const existingUser = await users.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return NextResponse.json({ error: "Email ou nome de usuário já está em uso" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await users.insertOne({
      name,
      email,
      username,
      password: hashedPassword,
      createdAt: new Date(),
    })

    const token = jwt.sign(
      {
        userId: result.insertedId,
        email,
        name,
        username,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    return NextResponse.json({
      message: "Usuário criado com sucesso",
      token,
      user: {
        id: result.insertedId,
        name,
        email,
        username,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
