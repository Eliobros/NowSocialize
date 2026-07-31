import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { compare } from "bcrypt"
import type { User } from "@/types/user"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET

export async function POST(req: NextRequest) {
  try {
    if (!JWT_SECRET) {
      console.error("JWT_SECRET não configurado no ambiente")
      return NextResponse.json({ message: "Erro de configuração do servidor" }, { status: 500 })
    }

    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db() // usa o banco padrão da URI aqui

    const users = db.collection<User>("users")
    const user = await users.findOne({ email })

    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 })
    }

    const isPasswordValid = await compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 })
    }

    const profiles = db.collection("profiles")
    const profileInfo = await profiles.findOne({ userId: user._id })

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        avatar: profileInfo?.avatar,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    return NextResponse.json({ token }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Something went wrong!" }, { status: 500 })
  }
}
