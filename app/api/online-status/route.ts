import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import jwt from "jsonwebtoken"

export async function PUT(req: NextRequest) {
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
    const { isOnline } = await req.json()
    const client = await clientPromise
    const db = client.db("socializenow")
    const usersCollection = db.collection("users")

    const now = new Date()
    
    const updateData: any = {
      lastSeen: now.toISOString(),
    }

    // Só atualiza isOnline se for true (online)
    // Se for false (offline), mantém o lastSeen mas não marca como online
    if (isOnline) {
      updateData.isOnline = true
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar status online:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
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
    const usersCollection = db.collection("users")

    const now = new Date()
    
    // Marca como offline
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          isOnline: false,
          lastSeen: now.toISOString()
        } 
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar status offline:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}