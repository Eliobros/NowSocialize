import clientPromise from '@/lib/mongodb'

export const maxDuration = 30

export async function POST(req: Request) {
  const { email, code } = await req.json()

  if (!email || !code) {
    return new Response(JSON.stringify({ error: "Email e código são obrigatórios." }), { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db('socializenow')

    // 1. Buscar código no MongoDB
    const storedCodeData = await db.collection('verification_codes').findOne({
      email: email.toLowerCase().trim()
    })

    console.log('Buscando código para:', email.toLowerCase().trim())
    console.log('Resultado:', storedCodeData)

    if (!storedCodeData) {
      return new Response(
        JSON.stringify({ error: "Nenhum código de verificação encontrado para este e-mail." }),
        { status: 400 }
      )
    }

    // 2. Verificar expiração
    if (new Date() > new Date(storedCodeData.expiresAt)) {
      await db.collection('verification_codes').deleteOne({ _id: storedCodeData._id })
      return new Response(
        JSON.stringify({ error: "Código expirado. Solicite um novo." }),
        { status: 400 }
      )
    }

    // 3. Verificar se código confere
    if (storedCodeData.code !== code.trim()) {
      return new Response(
        JSON.stringify({ error: "Código de verificação inválido." }),
        { status: 400 }
      )
    }

    // 4. Código correto! Atualizar usuário
    const updateResult = await db.collection('users').updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { userEmailVerified: true } }
    )

    if (updateResult.modifiedCount === 0) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado." }),
        { status: 404 }
      )
    }

    // 5. Deletar o código usado
    await db.collection('verification_codes').deleteOne({ _id: storedCodeData._id })

    return new Response(
      JSON.stringify({ message: "Código verificado e e-mail confirmado com sucesso!" }),
      { status: 200 }
    )

  } catch (error) {
    console.error("Erro ao verificar código:", error)
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), { status: 500 })
  }
}
