// Removido: import axios from "axios"
// Removido: import SibApiV3Sdk from "sib-api-v3-sdk"

// Armazenamento temporário em memória para códigos de verificação
// Em produção, use um banco de dados (Supabase, Neon) ou cache (Upstash Redis)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

export const maxDuration = 30 // Permitir respostas de streaming de até 30 segundos

export async function POST(req: Request) {
  const { email, name } = await req.json()

  if (!email || !name) {
    return new Response(JSON.stringify({ error: "Email e nome são obrigatórios." }), { status: 400 })
  }

  // VOLTE PARA A VARIÁVEL DE AMBIENTE!
  const brevoApiKey = process.env.BREVO_API_KEY

  if (!brevoApiKey) {
    console.error("BREVO_API_KEY não está configurada.")
    return new Response(JSON.stringify({ error: "Erro de configuração do servidor: Chave da API Brevo ausente." }), {
      status: 500,
    })
  }

  // 1. Gerar código de verificação
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString() // Código de 6 dígitos
  const expiresAt = Date.now() + 5 * 60 * 1000 // Expira em 5 minutos

  // Armazenar o código temporariamente
  verificationCodes.set(email, { code: verificationCode, expiresAt })

  // 2. Personalizar o conteúdo do e-mail (mesmo HTML de antes)
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

  // 3. Dados para a requisição fetch
  const requestBody = {
    sender: {
      name: "SocializeNow",
      email: "eliobrostech@topaziocoin.online", // Precisa ser verificado na Brevo!
    },
    to: [
      {
        email: email,
        name: name,
      },
    ],
    subject: "Seu Código de Verificação SocializeNow",
    htmlContent: htmlContent,
    textContent: `Olá ${name}! Para concluir seu cadastro na SocializeNow, use o código: ${verificationCode}. Este código expira em 5 minutos. Se você não solicitou este código, ignore este e-mail.`,
  }

  console.log("Tentando enviar e-mail com os seguintes dados (usando fetch):", {
    sender: requestBody.sender,
    to: requestBody.to,
    subject: requestBody.subject,
  })

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

    const responseData = await response.json() // Tenta parsear a resposta como JSON

    console.log("Resposta da Brevo (Status):", response.status)
    console.log("Resposta da Brevo (Dados):", responseData)

    if (response.ok) {
      return new Response(JSON.stringify({ message: "Código de verificação enviado com sucesso!" }), { status: 200 })
    } else {
      // Se a resposta não for OK, logamos o erro da Brevo
      console.error("Erro da Brevo:", responseData)
      return new Response(JSON.stringify({ error: responseData.message || "Erro ao enviar código de verificação." }), {
        status: response.status,
      })
    }
  } catch (error: any) {
    console.error("Erro de conexão ao enviar e-mail de verificação:", error.message, error)
    return new Response(JSON.stringify({ error: "Erro de conexão. Tente novamente." }), {
      status: 500,
    })
  }
}

// Exportar para que o mapa possa ser acessado pela rota de verificação
export { verificationCodes }
