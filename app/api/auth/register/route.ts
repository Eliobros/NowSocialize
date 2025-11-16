import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import clientPromise from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  try {
    const { name, email, username, password, verificationToken } = await request.json()

    if (!name || !email || !username || !password || !verificationToken) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")

    // 1. Validar verification token
    const tokenRecord = await db.collection('verification_tokens').findOne({
      email: email.toLowerCase().trim(),
      token: verificationToken
    })

    if (!tokenRecord) {
      return NextResponse.json({ error: "Token de verificação inválido ou expirado. Verifique seu email novamente." }, { status: 400 })
    }

    // 2. Verificar se token expirou
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      await db.collection('verification_tokens').deleteOne({ _id: tokenRecord._id })
      return NextResponse.json({ error: "Token expirado. Verifique seu email novamente." }, { status: 400 })
    }

    const users = db.collection("users")

    // 3. Verificar se já existe usuário com o mesmo e-mail ou username
    const existingUser = await users.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return NextResponse.json({ error: "Email ou nome de usuário já está em uso" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // 4. Criar usuário COM email já verificado
    const result = await users.insertOne({
      name,
      email: email.toLowerCase().trim(),
      username,
      password: hashedPassword,
      userEmailVerified: true, // ✅ Já verificado!
      createdAt: new Date(),
    })

    // 5. Deletar o token usado
    await db.collection('verification_tokens').deleteOne({ _id: tokenRecord._id })

    const authToken = jwt.sign(
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
      token: authToken,
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
