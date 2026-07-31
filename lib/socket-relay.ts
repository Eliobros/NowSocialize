// lib/socket-relay.ts
// Ajuda a API a avisar o socket server sobre novas mensagens em tempo real.
// - Se o app roda no mesmo processo do socket server (server.js), usa o io global.
// - Caso contrário (Vercel/serverless), conecta como client e pede o relay.
import { io as createClient, type Socket } from "socket.io-client"

const SOCKET_SERVER_URL =
  process.env.SOCKET_SERVER_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://socket.mozhost.shop"

const RELAY_SECRET = process.env.SOCKET_RELAY_SECRET || process.env.JWT_SECRET || "socializenow-relay"

interface NewMessagePayload {
  conversationId: string
  senderId: string
  message: Record<string, unknown>
  senderMessage?: Record<string, unknown>
}

/**
 * Emite "new_message" para a sala da conversa e para a sala do remetente.
 * O destinatário recebe `message` (traduzido, se aplicável) e o remetente
 * recebe `senderMessage` (o texto original).
 */
export async function emitNewMessage(payload: NewMessagePayload): Promise<void> {
  const g = global as any

  // Mesmo processo do socket server (server.js)
  if (g.__SOCKET_SERVER__ && g.io) {
    try {
      // Remetente recebe o ORIGINAL primeiro (evita ver a versão traduzida)
      if (payload.senderId) {
        g.io.to(payload.senderId).emit("new_message", payload.senderMessage || payload.message)
      }
      g.io.to(payload.conversationId).emit("new_message", payload.message)
    } catch (err) {
      console.error("[socket-relay] Erro ao emitir via io global:", err)
    }
    return
  }

  // Processo separado: conecta ao socket server e pede o relay
  return new Promise<void>((resolve) => {
    let socket: Socket | null = null
    let done = false
    const finish = () => {
      if (done) return
      done = true
      try {
        socket?.disconnect()
      } catch {}
      resolve()
    }
    const timer = setTimeout(finish, 4000)

    try {
      socket = createClient(SOCKET_SERVER_URL, {
        transports: ["websocket", "polling"],
        reconnection: false,
        forceNew: true,
        timeout: 3000,
      })

      socket.on("connect", () => {
        socket?.emit("relay_new_message", {
          conversationId: payload.conversationId,
          senderId: payload.senderId,
          message: payload.message,
          senderMessage: payload.senderMessage || payload.message,
          secret: RELAY_SECRET,
        })
        clearTimeout(timer)
        setTimeout(finish, 200)
      })

      socket.on("relay_ack", () => {
        clearTimeout(timer)
        setTimeout(finish, 50)
      })

      socket.on("connect_error", () => {
        clearTimeout(timer)
        finish()
      })
    } catch (err) {
      console.error("[socket-relay] Erro ao conectar ao socket server:", err)
      clearTimeout(timer)
      finish()
    }
  })
}
