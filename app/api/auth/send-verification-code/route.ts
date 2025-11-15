import clientPromise from '@/lib/mongodb'

export const maxDuration = 30

export async function POST(req: Request) {
  const { email, name } = await req.json()

  if (!email || !name) {
    return new Response(JSON.stringify({ error: "Email e nome são obrigatórios." }), { status: 400 })
  }

  const brevoApiKey = process.env.BREVO_API_KEY

  if (!brevoApiKey) {
    console.error("BREVO_API_KEY não está configurada.")
    return new Response(JSON.stringify({ error: "Erro de configuração do servidor." }), { status: 500 })
  }

  // 1. Gerar código
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos

  try {
    // 2. SALVAR NO MONGODB (não no Map!)
    const client = await clientPromise
    const db = client.db('socializenow')
    
    // Remove códigos antigos desse email e insere o novo
    await db.collection('verification_codes').deleteMany({ email: email.toLowerCase().trim() })
    await db.collection('verification_codes').insertOne({
      email: email.toLowerCase().trim(),
      code: verificationCode,
      expiresAt,
      createdAt: new Date()
    })

    console.log('Código salvo no MongoDB:', { email, code: verificationCode })

  } catch (error) {
    console.error('Erro ao salvar código no MongoDB:', error)
    return new Response(JSON.stringify({ error: "Erro ao salvar código." }), { status: 500 })
  }

  // 3. Enviar email (seu código atual de envio...)
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Código de Verificação</title>
  <style>
    body {
      background-color: #f4f4f4;
      font-family: Arial, sans-serif;
      padding: 0;
      margin: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      text-align: center;
    }
    .logo {
      margin-bottom: 20px;
    }
    .logo img {
      max-width: 150px;
    }
    .header {
      color: #4b4b4b;
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      color: #007bff;
      margin: 30px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://socializenow.vercel.app/soocializenow.png" alt="Logo SocializeNow">
    </div>
    <h2 class="header">Verifique seu e-mail</h2>
    <p>Olá ${name}! Para concluir seu cadastro na <strong>SocializeNow</strong>, use o código abaixo:</p>
    <div class="code">${verificationCode}</div>
    <p>Este código expira em 5 minutos.</p>
    <p>Se você não solicitou este código, ignore este e-mail.</p>
    <div class="footer">
      &copy; 2025 SocializeNow. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>`

  const requestBody = {
    sender: {
      name: "SocializeNow",
      email: "eliobrostech@topaziocoin.online",
    },
    to: [{ email, name }],
    subject: "Seu Código de Verificação SocializeNow",
    htmlContent,
    textContent: `Olá ${name}! Para concluir seu cadastro na SocializeNow, use o código: ${verificationCode}. Este código expira em 5 minutos.`,
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

    const responseData = await response.json()

    if (response.ok) {
      return new Response(JSON.stringify({ message: "Código enviado com sucesso!" }), { status: 200 })
    } else {
      console.error("Erro da Brevo:", responseData)
      return new Response(JSON.stringify({ error: responseData.message || "Erro ao enviar código." }), {
        status: response.status,
      })
    }
  } catch (error: any) {
    console.error("Erro ao enviar e-mail:", error)
    return new Response(JSON.stringify({ error: "Erro de conexão." }), { status: 500 })
  }
}

// REMOVER ESSA LINHA:
// export { verificationCodes }
