// hooks/use-live-socket.ts — socket da sala live:{liveId} (viewers, ended, chat).
"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import type { LiveChatMessage } from "@/components/live/types"

interface UseLiveSocketOptions {
  userId: string
  liveId: string
  onViewersUpdated?: (data: { liveId: string; viewersCount: number }) => void
  onLiveEnded?: (data: { liveId: string; endedAt: string }) => void
  onLiveMessage?: (message: LiveChatMessage) => void
  /** Chamado quando o socket reconecta (para re-sincronizar: re-join + histórico). */
  onReconnect?: () => void
  /** Chamado quando uma mensagem de chat é rejeitada (motivo do servidor). */
  onChatError?: (reason: string) => void
}

export function useLiveSocket(options: UseLiveSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const hadConnectedRef = useRef(false)
  const callbacksRef = useRef(options)
  callbacksRef.current = options

  const [isConnected, setIsConnected] = useState(false)
  const [socketId, setSocketId] = useState<string | null>(null)

  const { userId, liveId } = options

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token || !userId || !liveId) return

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "https://socket.mozhost.shop", {
      transports: ["websocket", "polling"],
      secure: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      auth: { token },
    })
    socketRef.current = socket

    socket.on("connect", () => {
      setIsConnected(true)
      setSocketId(socket.id ?? null)
      socket.emit("join", userId)
      socket.emit("join_live_room", liveId)

      if (hadConnectedRef.current) {
        callbacksRef.current.onReconnect?.()
      }
      hadConnectedRef.current = true
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
      setSocketId(null)
    })

    socket.on("live_viewers_updated", (data) => {
      callbacksRef.current.onViewersUpdated?.(data)
    })
    socket.on("live_ended", (data) => {
      callbacksRef.current.onLiveEnded?.(data)
    })
    socket.on("live_message", (message: LiveChatMessage) => {
      callbacksRef.current.onLiveMessage?.(message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId, liveId])

  const sendLiveMessage = (message: string) => {
    const socket = socketRef.current
    if (!socket?.connected) {
      callbacksRef.current.onChatError?.("offline")
      return
    }
    let answered = false
    const timer = setTimeout(() => {
      if (!answered) {
        answered = true
        callbacksRef.current.onChatError?.("timeout")
      }
    }, 5000)
    socket.emit("send_live_message", { liveId, message }, (ack: { ok?: boolean; reason?: string } | undefined) => {
      if (answered) return
      answered = true
      clearTimeout(timer)
      if (!ack || ack.ok !== true) {
        callbacksRef.current.onChatError?.(ack?.reason || "unknown")
      }
    })
  }

  const leaveRoom = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave_live_room")
    }
  }

  return { socketId, isConnected, sendLiveMessage, leaveRoom }
}
