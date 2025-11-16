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

    // 4. Código correto! Gera token de verificação
    const verificationToken = Buffer.from(`${email}:${Date.now()}`).toString('base64')
    
    // Salva o token temporariamente (30 minutos)
    await db.collection('verification_tokens').insertOne({
      email: email.toLowerCase().trim(),
      token: verificationToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
      createdAt: new Date()
    })

    // 5. Deletar o código usado (evita reuso)
    await db.collection('verification_codes').deleteOne({ _id: storedCodeData._id })

    return new Response(
      JSON.stringify({ 
        message: "Código verificado com sucesso!",
        verificationToken // Frontend vai usar isso pra criar a conta
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error("Erro ao verificar código:", error)
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), { status: 500 })
  }
}
