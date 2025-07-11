import clientPromise from '@/lib/mongodb'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return new Response("Token ausente", { status: 400 })

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }

    const client = await clientPromise
    const db = client.db('socializenow')

    // Atualiza usuário: marca userEmailVerified: true
    await db.collection('users').updateOne(
      { _id: new (await import('mongodb')).ObjectId(payload.userId) },
      { $set: { userEmailVerified: true } }
    )

    // Redireciona para página de sucesso
    return NextResponse.redirect('https://socializenow.topaziocoin.online/email-verificado')
  } catch (error) {
    return new Response("Token inválido ou expirado.", { status: 400 })
  }
}
