import type { NextRequest } from "next/server"
import { Server as SocketIOServer } from "socket.io"
import { Server as HTTPServer } from "http"

let io: SocketIOServer

export async function GET(req: NextRequest) {
  if (!io) {
    const httpServer = new HTTPServer()
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id)

      // Join user to their room
      socket.on("join", (userId) => {
        socket.join(userId)
        socket.userId = userId
        console.log(`User ${userId} joined room`)
      })

      // Handle call initiation
      socket.on("call-user", (data) => {
        const { to, from, signal, callerName } = data
        io.to(to).emit("incoming-call", {
          from,
          signal,
          callerName,
          callId: `${from}-${to}-${Date.now()}`,
        })
      })

      // Handle call acceptance
      socket.on("accept-call", (data) => {
        const { to, signal, callId } = data
        io.to(to).emit("call-accepted", { signal, callId })
      })

      // Handle call rejection
      socket.on("reject-call", (data) => {
        const { to, callId } = data
        io.to(to).emit("call-rejected", { callId })
      })

      // Handle call end
      socket.on("end-call", (data) => {
        const { to, callId } = data
        io.to(to).emit("call-ended", { callId })
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

      // Handle group call join
      socket.on("join-group-call", (data) => {
        const { callId, userId, signal } = data
        socket.join(callId)
        socket.to(callId).emit("user-joined-call", {
          userId,
          signal,
        })
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

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id)
      })
    })

    httpServer.listen(3001)
  }

  return new Response("Socket.IO server running", { status: 200 })
}
