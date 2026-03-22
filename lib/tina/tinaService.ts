// lib/tina/tinaService.ts
// Serviço de IA Tina para SocializeNow - Gemini com Function Calling

import { GoogleGenerativeAI } from "@google/generative-ai"
import { functionDeclarations, executeFunction } from "./tinaFunctions"

const SYSTEM_INSTRUCTION = `Você é a Tina, a assistente de IA da SocializeNow, uma rede social moderna.

Você tem acesso a funções que consultam dados REAIS do banco de dados da SocializeNow. USE SEMPRE as funções disponíveis para buscar dados reais. Nunca invente dados.

Responda sempre em português de forma simpática, amigável e com personalidade. Use emojis moderadamente.

Você pode ajudar o usuário com:
- Ver informações da sua conta e perfil
- Consultar seus posts, seguidores e estatísticas
- Sugerir textos para posts sobre qualquer assunto
- Tirar dúvidas sobre a SocializeNow
- Ver seus interesses e sugerir conteúdo

IMPORTANTE: Você só pode acessar dados do usuário autenticado. Nunca acesse dados de outros usuários.
Quando o usuário pedir sugestões de posts, use a função "sugerir_texto_post" e depois crie o texto baseado no resultado.`

interface UserInfo {
  userId: string
  username: string
  email: string
  name: string
}

interface ChatSession {
  chat: any
  createdAt: number
}

const chats = new Map<string, ChatSession>()

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada")
  }
  return new GoogleGenerativeAI(apiKey)
}

function getOrCreateChat(userId: string, userInfo: UserInfo) {
  const key = String(userId)

  const existing = chats.get(key)
  if (existing) {
    return existing.chat
  }

  const userContext = `\n\nUSUÁRIO AUTENTICADO ATUAL:
- ID: ${userInfo.userId}
- Nome: ${userInfo.name}
- Username: ${userInfo.username}
- Email: ${userInfo.email}

Quando o usuário perguntar sobre "meus posts", "minha conta", "meus seguidores", etc., use as funções disponíveis para buscar os dados dele.`

  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION + userContext,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
    },
    tools: [{ functionDeclarations: functionDeclarations as any }],
  })

  const chat = model.startChat({ history: [] })
  chats.set(key, { chat, createdAt: Date.now() })

  // Limpar chat após 30 minutos de inatividade
  setTimeout(() => {
    chats.delete(key)
  }, 30 * 60 * 1000)

  return chat
}

export async function tinaChat(userId: string, message: string, userInfo: UserInfo) {
  try {
    const chat = getOrCreateChat(userId, userInfo)

    let result = await chat.sendMessage(message)
    let functionCallCount = 0

    // Loop para processar Function Calls
    while (true) {
      const candidate = result.response.candidates?.[0]
      const part = candidate?.content?.parts?.[0]

      if (part?.functionCall) {
        functionCallCount++
        const { name, args } = part.functionCall
        console.log(`🔧 Tina IA chamou: ${name}`, JSON.stringify(args))

        const functionResult = await executeFunction(name, args || {}, userId)

        result = await chat.sendMessage([
          {
            functionResponse: {
              name: name,
              response: functionResult,
            },
          },
        ])

        if (functionCallCount >= 5) {
          console.warn("⚠️ Limite de function calls atingido")
          break
        }
      } else {
        break
      }
    }

    const response = result.response.text()

    return {
      success: true,
      response,
      functionCalls: functionCallCount,
    }
  } catch (error: any) {
    console.error("❌ Erro na Tina IA:", error.message)
    return { success: false, error: error.message }
  }
}

export function resetTinaChat(userId: string) {
  chats.delete(String(userId))
}
