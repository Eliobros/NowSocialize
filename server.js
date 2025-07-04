const { createServer } = require("http")
const { Server } = require("socket.io")
const next = require("next")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

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

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Join user to their room
    socket.on("join", (userId) => {
      socket.join(userId)
      socket.userId = userId
      activeUsers.set(userId, socket.id)
      console.log(`User ${userId} joined room`)
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

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)
      // Remove from active users
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId)
          break
        }
      }
    })
  })

  const PORT = process.env.PORT || 3000
  server.listen(PORT, (err) => {
    if (err) throw err
    console.log(`> Ready on http://108.181.199.60:${PORT}`)
    console.log(`> Socket.IO server running`)
  })
})
