import { verificationCodes } from "../send-verification-code/route" // Importa o mapa de códigos

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

  return new Response(JSON.stringify({ message: "Código verificado com sucesso!" }), { status: 200 })
}
