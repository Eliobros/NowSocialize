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
  const server = createServer((req, res) => {
    handle(req, res)
  })

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  // Store active users
  const activeUsers = new Map()

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
    socket.on("call-user", (data) => {
      const { to, from, signal, callerName, callType } = data
      console.log(`Call from ${from} to ${to}`)

      io.to(to).emit("incoming-call", {
        from,
        signal,
        callerName,
        callType, // 'audio' or 'video'
        callId: `${from}-${to}-${Date.now()}`,
      })
    })

    // Handle call acceptance
    socket.on("accept-call", (data) => {
      const { to, signal, callId } = data
      console.log(`Call accepted: ${callId}`)
      io.to(to).emit("call-accepted", { signal, callId })
    })

    // Handle call rejection
    socket.on("reject-call", (data) => {
      const { to, callId } = data
      console.log(`Call rejected: ${callId}`)
      io.to(to).emit("call-rejected", { callId })
    })

    // Handle call end
    socket.on("end-call", (data) => {
      const { to, callId } = data
      console.log(`Call ended: ${callId}`)
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

     // ✨ ADICIONA AQUI ✨
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

// Enviar mensagem (opcional - pode usar só via API)
socket.on("send_message", async (data) => {
  const { conversationId, content, image } = data
  
  // Emite pra todos na conversa
  io.to(conversationId).emit("new_message", {
    ...data,
    createdAt: new Date().toISOString(),
  })
  
  console.log(`Message sent to conversation ${conversationId}`)
})

// ================================================================


    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id)
      
      // Remove from active users and mark as offline
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
