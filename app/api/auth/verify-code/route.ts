import { verificationCodes } from "../send-verification-code/route"
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export const maxDuration = 30

export async function POST(req: Request) {
  const { email, code } = await req.json()

  if (!email || !code) {
    return new Response(JSON.stringify({ error: "Email e código são obrigatórios." }), { status: 400 })
  }

  const storedCodeData = verificationCodes.get(email)

  if (!storedCodeData) {
    return new Response(JSON.stringify({ error: "Nenhum código de verificação encontrado para este e-mail." }), {
      status: 400,
    })
  }

  if (storedCodeData.code !== code) {
    return new Response(JSON.stringify({ error: "Código de verificação inválido." }), { status: 400 })
  }

  if (Date.now() > storedCodeData.expiresAt) {
    verificationCodes.delete(email) // Remove o código expirado
    return new Response(JSON.stringify({ error: "Código de verificação expirado. Solicite um novo." }), { status: 400 })
  }

  // Código verificado com sucesso, remova-o para evitar reuso
  verificationCodes.delete(email)

  try {
    const client = await clientPromise
    const db = client.db('socializenow')

    // Atualiza o usuário marcando userEmailVerified como true pelo email
    const result = await db.collection('users').updateOne(
      { email: email },
      { $set: { userEmailVerified: true } }
    )

    if (result.modifiedCount === 0) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado para o e-mail fornecido." }), {
        status: 404,
      })
    }

    return new Response(JSON.stringify({ message: "Código verificado e e-mail confirmado com sucesso!" }), { status: 200 })
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error)
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), { status: 500 })
  }
}