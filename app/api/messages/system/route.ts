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

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const systemMessages = db.collection("systemMessages")

    const messages = await systemMessages
      .find({ userId: new ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    const formatted = messages.map(msg => ({
      _id: msg._id.toString(),
      content: msg.content,
      sender: { _id: "socializenow-system", name: "SocializeNow", avatar: "/logo.png" },
      createdAt: msg.createdAt,
      read: msg.read || false,
    }))

    return NextResponse.json({ messages: formatted })
  } catch (error) {
    console.error("System messages error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
