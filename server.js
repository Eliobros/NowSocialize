require('dotenv').config()
const { createServer } = require("http")
const { Server } = require("socket.io")
const next = require("next")
const { MongoClient, ObjectId } = require("mongodb")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

// MongoDB connection
let db
const connectToMongo = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    db = client.db("socializenow")
    console.log("Connected to MongoDB")
  } catch (error) {
    console.error("MongoDB connection error:", error)
  }
}

connectToMongo()

app.prepare().then(() => {
  // ==================== TRADUÇÃO ====================
  const server = createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/api/translate") {
      let body = ""
      req.on("data", chunk => body += chunk)
      req.on("end", async () => {
        try {
          const { text, target } = JSON.parse(body)

          const response = await fetch("http://localhost:5000/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: text, source: "auto", target: target || "pt" })
          })

          const data = await response.json()

          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          })
          res.end(JSON.stringify({ translatedText: data.translatedText, detectedLanguage: data.detectedLanguage }))
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }
    handle(req, res)
  })
  // =================================================

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

global.io = io
global.__SOCKET_SERVER__ = true

  // Store active users
  const activeUsers = new Map()

  // ==================== HISTÓRICO DE CHAMADAS ====================
  const getCallLogName = async (userId) => {
    try {
      const user = await db.collection("users").findOne({ _id: new ObjectId(userId) })
      return user?.name || ""
    } catch (err) {
      return ""
    }
  }

  const logCall = async (data) => {
    if (!db) return
    try {
      await db.collection("callLogs").insertOne({
        userId: data.userId,
        peerId: data.peerId,
        peerName: data.peerName || "",
        type: data.type || "video",
        status: data.status,
        callId: data.callId,
        startedAt: data.startedAt || new Date().toISOString(),
        endedAt: data.endedAt || null,
        duration: typeof data.duration === "number" ? data.duration : null,
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error("Erro ao registrar chamada no histórico:", err)
    }
  }

  const finalizeCallLogs = async (callId) => {
    if (!db || !callId) return
    try {
      const now = new Date()
      const logs = await db.collection("callLogs").find({ callId }).toArray()
      for (const log of logs) {
        let duration = null
        // Duração (tempo de conversa) só para chamadas atendidas/feitas —
        // perdidas/rejeitadas mostram apenas o horário, sem tempo.
        if (log.startedAt && (log.status === "made" || log.status === "received")) {
          const started = new Date(log.startedAt)
          if (!isNaN(started.getTime())) {
            duration = Math.max(0, Math.floor((now.getTime() - started.getTime()) / 1000))
          }
        }
        await db.collection("callLogs").updateOne(
          { _id: log._id },
          { $set: { endedAt: now.toISOString(), duration } }
        )
      }
    } catch (err) {
      console.error("Erro ao finalizar logs de chamada:", err)
    }
  }

  // Function to update user online status
  const updateUserOnlineStatus = async (userId, isOnline) => {
    if (!db) return

    try {
      const now = new Date()

      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { isOnline, lastSeen: now.toISOString() } }
      )

      // Broadcast online status to all connected users
      io.emit("user-status-changed", {
        userId,
        isOnline,
        lastSeen: now.toISOString()
      })
    } catch (error) {
      console.error("Error updating user online status:", error)
    }
  }

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Join user to their room
    socket.on("join", async (userId) => {
      socket.join(userId)
      socket.userId = userId
      activeUsers.set(userId, socket.id)
      console.log(`User ${userId} joined room`)

      // Update user as online
      await updateUserOnlineStatus(userId, true)
    })

    // Handle call initiation
    socket.on("call-user", async (data) => {
      const { to, signal, callerName, callType, callId } = data
      // `from` é derivado do socket autenticado/registrado (anti-spoofing)
      const from = socket.userId || data.from
      const finalCallId = callId || `${from}-${to}-${Date.now()}`
      console.log(`Call from ${from} to ${to}`)

      // Registra no histórico: chamador = feita | receptor = perdida (atualizada ao atender)
      // Os inserts são paralelos (o log do receptor não depende do lookup do nome do callee)
      if (db) {
        const calleeName = await getCallLogName(to)
        const startedAt = new Date().toISOString()
        await Promise.all([
          logCall({ userId: from, peerId: to, peerName: calleeName, type: callType, status: "made", callId: finalCallId, startedAt }),
          logCall({ userId: to, peerId: from, peerName: callerName, type: callType, status: "missed", callId: finalCallId, startedAt }),
        ])
      }

      io.to(to).emit("incoming-call", {
        from,
        signal,
        callerName,
        callType,
        // Usa o callId do chamador (ambos os lados da chamada compartilham o mesmo ID)
        callId: finalCallId,
      })
    })

   socket.onAny((eventName, data) => {
  console.log(`[SOCKET DEBUG] Evento: ${eventName} | Dados:`, JSON.stringify(data));
});


    // Handle call acceptance
    socket.on("accept-call", (data) => {
      const { to, signal, callId } = data
      console.log(`Call accepted: ${callId}`)
      // Receptor atendeu: atualiza o log "perdida" -> "recebida"
      if (db && callId) {
        db.collection("callLogs")
          .updateOne({ callId, status: "missed" }, { $set: { status: "received" } })
          .catch((err) => console.error("Erro ao atualizar histórico de chamada:", err))
      }
      // `from` = userId de quem aceitou — o chamador usa isso para achar o peer
      // (peersRef é chaveado por userId, não por callId)
      io.to(to).emit("call-accepted", { signal, callId, from: socket.userId })
    })

    // Handle call rejection
    socket.on("reject-call", (data) => {
      const { to, callId } = data
      console.log(`Call rejected: ${callId}`)
      // Receptor recusou: log "perdida" -> "rejeitada"
      if (db && callId) {
        db.collection("callLogs")
          .updateOne({ callId, status: "missed" }, { $set: { status: "rejected" } })
          .catch((err) => console.error("Erro ao atualizar histórico de chamada:", err))
      }
      io.to(to).emit("call-rejected", { callId })
    })

    // Handle call end
    socket.on("end-call", (data) => {
      const { to, callId } = data
      console.log(`Call ended: ${callId}`)
      // Finaliza o histórico (duração + término) dos dois lados da chamada
      finalizeCallLogs(callId)
      io.to(to).emit("call-ended", { callId })
    })

    // Handle WebRTC signaling
    socket.on("webrtc-signal", (data) => {
      const { to, signal, callId } = data
      io.to(to).emit("webrtc-signal", {
        from: socket.userId,
        signal,
        callId,
      })
    })

    // Handle group call invitation
    socket.on("invite-to-call", (data) => {
      const { to, from, callId, callerName } = data
      io.to(to).emit("group-call-invite", {
        from,
        callId,
        callerName,
      })
    })

    // Handle user activity (keep alive)
    socket.on("user-activity", async () => {
      if (socket.userId) {
        await updateUserOnlineStatus(socket.userId, true)
      }
    })

    // ==================== MENSAGENS EM TEMPO REAL ====================

    // Entrar em conversa
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId)
      console.log(`User ${socket.userId} joined conversation ${conversationId}`)
    })

    // Sair de conversa
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(conversationId)
      console.log(`User ${socket.userId} left conversation ${conversationId}`)
    })

    // Typing indicator
    socket.on("typing_start", (data) => {
      const { conversationId } = data
      if (conversationId && socket.userId) {
        socket.to(conversationId).emit("user_typing", {
          userId: socket.userId,
          conversationId,
        })
      }
    })

    socket.on("typing_stop", (data) => {
      const { conversationId } = data
      if (conversationId && socket.userId) {
        socket.to(conversationId).emit("user_stop_typing", {
          userId: socket.userId,
          conversationId,
        })
      }
    })

    // ==================== MENSAGENS COM TRADUÇÃO ====================
    socket.on("send_message", async (data) => {
      const { conversationId, content, targetLang, image } = data

      console.log("-> Recebi no Socket:", content, "| Target:", targetLang); // LOG 1

  
      let finalContent = content
      let originalLanguage = null

      // Só traduz se tiver targetLang e conteúdo de texto
      if (targetLang && content) {
	   console.log("-> Chamando LibreTranslate...");
        try {
          const response = await fetch("http://localhost:5000/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: content,
              source: "auto",
              target: targetLang
            })
          })

          const translated = await response.json()

          if (translated.translatedText && translated.translatedText !== content) {
            finalContent = translated.translatedText
            originalLanguage = translated.detectedLanguage?.language || null
          }
        } catch (err) {
          console.error("Erro ao traduzir no Socket:", err.message)
          // fallback: envia o original sem tradução
        }
      }

      io.to(conversationId).emit("new_message", {
        ...data,
        content: finalContent,
        translatedContent: targetLang && finalContent !== content ? finalContent : null,
        originalContent: content,
        originalLanguage,
        createdAt: new Date().toISOString(),
      })

      console.log(`Mensagem enviada para ${conversationId}${targetLang ? ` (traduzida para ${targetLang})` : ""}`)
    })

    // ==================== RELAY DE MENSAGENS (server-to-server) ====================
    // A API (Vercel/serverless) conecta aqui como client e pede o broadcast
    socket.on("relay_new_message", (data) => {
      const { conversationId, senderId, message, senderMessage, secret } = data || {}
      if (!conversationId || !message) return

      // Protege o relay contra spoofing (apenas a API pode transmitir)
      const relaySecret = process.env.SOCKET_RELAY_SECRET || process.env.JWT_SECRET
      if (relaySecret && secret !== relaySecret) {
        console.log("Relay bloqueado: secret inválido")
        return
      }

      // Remetente recebe o conteúdo ORIGINAL primeiro (evita ver a versão traduzida)
      if (senderId && senderMessage) {
        io.to(senderId).emit("new_message", senderMessage)
      }

      // Destinatários na sala da conversa recebem o conteúdo traduzido
      io.to(conversationId).emit("new_message", message)

      // Confirma para a API que o broadcast foi feito
      socket.emit("relay_ack")
      console.log(`Relayed new_message para ${conversationId}`)
    })

    // ==================== CONFIRMAÇÃO DE LEITURA ====================
    socket.on("mark_read", async (data) => {
      const { conversationId, userId } = data
      if (conversationId && userId) {
        socket.to(conversationId).emit("messages_read", {
          conversationId,
          userId,
          readAt: new Date().toISOString(),
        })
        console.log(`Messages marked as read by ${userId} in ${conversationId}`)
      }
    })

    // ==================== REAÇÕES DE MENSAGENS ====================
    socket.on("message_reaction", async (data) => {
      const { conversationId, messageId, emoji, userId, action } = data
      if (conversationId && messageId) {
        io.to(conversationId).emit("reaction_updated", {
          conversationId,
          messageId,
          emoji,
          userId,
          action,
        })
        console.log(`Reaction ${action}: ${emoji} on message ${messageId}`)
      }
    })

    // ==================== NOTIFICAÇÕES EM TEMPO REAL ====================
    socket.on("send_notification", (data) => {
      const { toUserId, notification } = data
      if (toUserId) {
        io.to(toUserId).emit("new_notification", notification)
        console.log(`Notification sent to ${toUserId}`)
      }
    })

    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id)

      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId)
          await updateUserOnlineStatus(userId, false)
          break
        }
      }
    })
  })

  const PORT = process.env.PORT || 3000
  server.listen(PORT, (err) => {
    if (err) throw err
    const { networkInterfaces } = require('os')
    const nets = networkInterfaces()
    const ip = Object.values(nets).flat().find(n => n.family === 'IPv4' && !n.internal)?.address || 'localhost'
    console.log(`> Ready on http://${ip}:${PORT}`)
    console.log(`> Socket.IO server running`)
  })
})
