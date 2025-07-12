import jwt from "jsonwebtoken"

export const maxDuration = 30

export async function POST(req: Request) {
  const { email, name = "usuário" } = await req.json()

  if (!email) {
    return new Response(JSON.stringify({ error: "O email é obrigatório." }), { status: 400 })
  }

  const brevoApiKey = process.env.BREVO_API_KEY
  const jwtSecret = process.env.JWT_SECRET || "secret"

  if (!brevoApiKey) {
    console.error("BREVO_API_KEY não está configurada.")
    return new Response(JSON.stringify({ error: "Erro de configuração do servidor." }), { status: 500 })
  }

  // 1. Gerar token com expiração de 15 minutos
  const token = jwt.sign({ email }, jwtSecret, { expiresIn: "15m" })

  // 2. Montar conteúdo do e-mail
  const resetLink = `https://socializenow.topaziocoin.online/reset-password?token=${token}`

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redefinição de Senha</title>
  <style>
    body { background-color: #f4f4f4; font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; padding: 30px; border-radius: 10px; text-align: center; }
    .logo img { max-width: 150px; margin-bottom: 20px; }
    .header { color: #333; }
    .button { display: inline-block; padding: 12px 24px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { font-size: 12px; color: #999; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://socializenow.vercel.app/soocializenow.png" alt="Logo SocializeNow">
    </div>
    <h2 class="header">Redefinir sua senha</h2>
    <p>Olá ${name}, recebemos uma solicitação para redefinir sua senha.</p>
    <p>Clique no botão abaixo para continuar:</p>
    <a class="button" href="${resetLink}">Redefinir Senha</a>
    <p>Este link expira em 15 minutos. Se você não solicitou isso, ignore este e-mail.</p>
    <div class="footer">&copy; 2025 SocializeNow. Todos os direitos reservados.</div>
  </div>
</body>
</html>`

  const requestBody = {
    sender: {
      name: "SocializeNow",
      email: "eliobrostech@topaziocoin.online", // deve estar verificado na Brevo
    },
    to: [{ email, name }],
    subject: "Redefinição de Senha - SocializeNow",
    htmlContent,
    textContent: `Olá ${name}, para redefinir sua senha acesse: ${resetLink}. O link expira em 15 minutos.`,
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()
    console.log("Resposta da Brevo:", response.status, data)

    if (response.ok) {
      return new Response(JSON.stringify({ message: "E-mail de redefinição enviado com sucesso." }), { status: 200 })
    } else {
      return new Response(JSON.stringify({ error: data.message || "Erro ao enviar e-mail." }), { status: 500 })
    }
  } catch (error: any) {
    console.error("Erro ao enviar e-mail de redefinição:", error.message)
    return new Response(JSON.stringify({ error: "Erro ao conectar ao serviço de e-mail." }), { status: 500 })
  }
}
