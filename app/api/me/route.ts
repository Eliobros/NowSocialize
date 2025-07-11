import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb" // Importa seu clientPromise
import { ObjectId } from "mongodb" // Para trabalhar com _id do MongoDB
import jwt from "jsonwebtoken" // Para verificar o JWT

// Interface para o documento do usuário no MongoDB
interface UserDocument {
  _id: ObjectId
  name: string
  email: string
  username: string
  isEmailVerified: boolean // Campo que armazena o status de verificação
  // Adicione outros campos do seu usuário aqui
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.split(" ")[1]

  if (!token) {
    return NextResponse.json({ error: "Não autorizado: Token não fornecido." }, { status: 401 })
  }

  const jwtSecret = process.env.JWT_SECRET // Sua chave secreta JWT
  if (!jwtSecret) {
    console.error("JWT_SECRET não está configurada nas variáveis de ambiente.")
    return NextResponse.json({ error: "Erro de configuração do servidor." }, { status: 500 })
  }

  let userId: string
  try {
    // Decodifica e verifica o token JWT
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    userId = decoded.userId
  } catch (error) {
    console.error("Erro ao verificar token JWT:", error)
    return NextResponse.json({ error: "Não autorizado: Token inválido ou expirado." }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db("socializenow") // Substitua "socializenow" pelo nome do seu banco de dados
    const usersCollection = db.collection<UserDocument>("users") // Substitua "users" pelo nome da sua coleção de usuários

    // Busca o usuário pelo _id
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    // Retorna os dados do usuário, incluindo o status de verificação
    return NextResponse.json({
      name: user.name,
      email: user.email,
      username: user.username,
      userEmailVerified: user.isEmailVerified ?? false, // Garante que seja booleano, default para false
    })
  } catch (error) {
    console.error("Erro ao buscar usuário no MongoDB:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
