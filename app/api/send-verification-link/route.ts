import clientPromise from '@/lib/mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey' // Mude para variável ambiente

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return new Response(JSON.stringify({ error: "Email obrigatório." }), { status: 400 })

  // Conectar no banco
  const client = await clientPromise
  const db = client.db('socializenow')

  // Buscar usuário pelo email
  const user = await db.collection('users').findOne({ email })
  if (!user) return new Response(JSON.stringify({ error: "Usuário não encontrado." }), { status: 404 })

  // Gerar token JWT com validade de 5 minutos
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    JWT_SECRET,
    { expiresIn: '5m' }
  )

  // Construir link de verificação
  const verificationLink = `https://socializenow.topaziocoin.online/api/verify-email?token=${token}`

  // TODO: Enviar email com link usando Brevo (ou outro serviço)
  // Exemplo básico usando fetch (ajuste o HTML para o link)
  const brevoApiKey = process.env.BREVO_API_KEY
  if (!brevoApiKey) {
    return new Response(JSON.stringify({ error: "API key Brevo não configurada." }), { status: 500 })
  }

  const emailBody = `
    <p>Olá,</p>
    <p>Clique no link abaixo para verificar seu e-mail e concluir o cadastro:</p>
    <a href="${verificationLink}">${verificationLink}</a>
    <p>O link expira em 5 minutos.</p>
  `

  const requestBody = {
    sender: { name: "SocializeNow", email: "eliobrostech@topaziocoin.online" },
    to: [{ email: user.email, name: user.name || "Usuário" }],
    subject: "Verifique seu e-mail - SocializeNow",
    htmlContent: emailBody,
    textContent: `Verifique seu e-mail com este link: ${verificationLink} (expira em 5 minutos).`,
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!res.ok) {
      const errorData = await res.json()
      return new Response(JSON.stringify({ error: errorData.message || "Erro ao enviar e-mail." }), { status: 500 })
    }

    return new Response(JSON.stringify({ message: "Link de verificação enviado com sucesso!" }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro ao enviar e-mail." }), { status: 500 })
  }
}
