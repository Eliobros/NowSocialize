"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { socketService } from "@/lib/socket"
import Peer from "simple-peer"

interface CallUser {
  userId: string
  name: string
  stream?: MediaStream
  peer?: Peer.Instance
}

// Servidores ICE configuráveis via variáveis de ambiente:
// - NEXT_PUBLIC_ICE_SERVERS: JSON array completo (sobrescreve tudo)
// - NEXT_PUBLIC_TURN_URL [+ _USERNAME/_CREDENTIAL]: adiciona um TURN ao STUN padrão
function getIceServers(): RTCIceServer[] {
  const defaultStun: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ]

  // Permite sobrescrever TODOS os ICE servers via JSON
  // (NEXT_PUBLIC_* são substituídos em build-time pelo Next no client)
  const custom = process.env.NEXT_PUBLIC_ICE_SERVERS
  if (custom) {
    try {
      const parsed = JSON.parse(custom)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch (e) {
      console.error("NEXT_PUBLIC_ICE_SERVERS inválido (deve ser um JSON array):", e)
    }
  }

  // TURN gratuito padrão (Open Relay Project — https://www.metered.ca/tools/openrelay/)
  // Necessário para conectar em NAT simétrico / redes móveis onde o STUN falha.
  // Substitua pelas suas credenciais via NEXT_PUBLIC_TURN_URL para produção.
  const freeTurn: RTCIceServer[] = [
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:80?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turns:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ]

  // TURN configurável via env — tem prioridade sobre o gratuito
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL
  if (turnUrl) {
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME
    const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL
    const turnServer: RTCIceServer = { urls: turnUrl }
    if (turnUsername && turnCredential) {
      turnServer.username = turnUsername
      turnServer.credential = turnCredential
    }
    return [...defaultStun, turnServer]
  }

  return [...defaultStun, ...freeTurn]
}

interface UseWebRTCReturn {
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  isCallActive: boolean
  isMuted: boolean
  isVideoEnabled: boolean
  callDuration: number
  participants: CallUser[]
  startCall: (userId: string, userName: string) => void
  acceptCall: () => void
  rejectCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleVideo: () => void
  addParticipant: (userId: string, userName: string) => void
  incomingCall: {
    from: string
    callerName: string
    callId: string
    callType?: "audio" | "video"
    signal?: any
  } | null
  startCallWithType: (userId: string, userName: string, callType: "audio" | "video") => void
  connectionStatus: "connecting" | "connected" | "disconnected" | "error"
}

export function useWebRTC(currentUserId: string, currentUserName: string): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [participants, setParticipants] = useState<CallUser[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected")
  const [incomingCall, setIncomingCall] = useState<{
    from: string
    callerName: string
    callId: string
    callType?: "audio" | "video"
    signal?: any
  } | null>(null)

  const peersRef = useRef<Map<string, Peer.Instance>>(new Map())
  const callTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const currentCallId = useRef<string>("")
  const callStartTime = useRef<number>(0)
  const activityTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Refs para evitar dependências instáveis no endCall
  const participantsRef = useRef<CallUser[]>([])
  const localStreamRef = useRef<MediaStream | null>(null)

  // Helpers que atualizam state e ref ao mesmo tempo
  const setParticipantsWithRef = useCallback((value: CallUser[]) => {
    participantsRef.current = value
    setParticipants(value)
  }, [])

  const setLocalStreamWithRef = useCallback((value: MediaStream | null) => {
    localStreamRef.current = value
    setLocalStream(value)
  }, [])

  // Function to update online status
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const method = isOnline ? "PUT" : "PATCH"
      const body = isOnline ? JSON.stringify({ isOnline: true }) : undefined

      await fetch("/api/online-status", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      })
    } catch (error) {
      console.error("Error updating online status:", error)
    }
  }, [])

  // Function to send user activity
  const sendUserActivity = useCallback(() => {
    const socket = socketService.getSocket()
    if (socket?.connected) {
      socket.emit("user-activity")
    }
  }, [])

  const startCallTimer = useCallback(() => {
    callStartTime.current = Date.now()
    callTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000)
      setCallDuration(elapsed)
    }, 1000)
  }, [])

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = undefined
    }
    setCallDuration(0)
    callStartTime.current = 0
  }, [])

  const endCall = useCallback(() => {
    // Usar ref em vez de state para evitar dependência instável
    participantsRef.current.forEach((participant) => {
      const socket = socketService.getSocket()
      if (socket?.connected) {
        socket.emit("end-call", {
          to: participant.userId,
          callId: currentCallId.current,
        })
      }
    })

    // Close all peer connections
    peersRef.current.forEach((peer) => peer.destroy())
    peersRef.current.clear()

    // Stop local stream via ref
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      setLocalStreamWithRef(null)
    }

    // Reset state
    setIsCallActive(false)
    setRemoteStreams(new Map())
    setParticipantsWithRef([])
    setIncomingCall(null)
    stopCallTimer()
    currentCallId.current = ""

    // Notifica a aba de histórico de chamadas para atualizar
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("call-history-refresh"))
    }
  }, [stopCallTimer, setLocalStreamWithRef, setParticipantsWithRef])

  useEffect(() => {
    const socket = socketService.connect(currentUserId)

    socket.on("connect", () => {
      setConnectionStatus("connected")
      updateOnlineStatus(true)
    })

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected")
      updateOnlineStatus(false)
    })

    socket.on("connect_error", () => {
      setConnectionStatus("error")
      updateOnlineStatus(false)
    })

    socket.on("incoming-call", (data) => {
      // Ignora chamadas novas enquanto já estiver em uma chamada ativa
      // (evita o modal reaparecer se o peer do chamador reconectar via call-user)
      if (currentCallId.current) return

      // Guarda também a oferta (signal) para o acceptCall poder aplicar peer.signal(offer)
      setIncomingCall({
        from: data.from,
        callerName: data.callerName,
        callId: data.callId,
        callType: data.callType,
        signal: data.signal,
      })
    })

    socket.on("call-accepted", (data) => {
      // peersRef é chaveado por userId — o servidor envia `from` (userId de quem aceitou)
      const peer = peersRef.current.get(data.from)
      if (peer) {
        peer.signal(data.signal)
      }
      if (!callTimerRef.current) {
        startCallTimer()
      }
    })

    socket.on("call-rejected", () => {
      setIncomingCall(null)
      endCall()
    })

    socket.on("call-ended", () => {
      endCall()
    })

    socket.on("webrtc-signal", (data) => {
      const peer = peersRef.current.get(data.from)
      if (peer) {
        peer.signal(data.signal)
      }
    })

    socket.on("user-status-changed", (data) => {
      console.log("User status changed:", data)
    })

    activityTimerRef.current = setInterval(() => {
      sendUserActivity()
    }, 30000)

    return () => {
      socket.off("connect")
      socket.off("disconnect")
      socket.off("connect_error")
      socket.off("incoming-call")
      socket.off("call-accepted")
      socket.off("call-rejected")
      socket.off("call-ended")
      socket.off("webrtc-signal")
      socket.off("user-status-changed")

      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current)
      }

      updateOnlineStatus(false)
    }
  }, [currentUserId, updateOnlineStatus, sendUserActivity, startCallTimer, endCall])

  const getUserMedia = useCallback(async (callType: "audio" | "video" = "video") => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      console.warn("getUserMedia não está disponível neste ambiente.")
      return null
    }

    try {
      const constraints = {
        video: callType === "video",
        audio: true,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStreamWithRef(stream)
      setIsVideoEnabled(callType === "video")
      return stream
    } catch (error) {
      console.error("Erro ao acessar dispositivos de mídia:", error)

      if (callType === "video") {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          setLocalStreamWithRef(audioStream)
          setIsVideoEnabled(false)
          return audioStream
        } catch (audioError) {
          console.error("Erro ao acessar áudio:", audioError)
        }
      }

      return null
    }
  }, [setLocalStreamWithRef])

  const createPeer = useCallback(
    (
      userId: string,
      initiator: boolean,
      stream: MediaStream,
      emitMode: "call-user" | "accept-call" | "webrtc-signal" = "webrtc-signal",
      callType: "audio" | "video" = "video",
    ) => {
      const peer = new Peer({
        initiator,
        trickle: false,
        stream,
        config: {
          iceServers: getIceServers(),
        },
      })

      peer.on("signal", (signal) => {
        const socket = socketService.getSocket()
        if (!socket?.connected) return

        if (emitMode === "call-user") {
          socket.emit("call-user", {
            to: userId,
            from: currentUserId,
            signal,
            callerName: currentUserName,
            callType,
            callId: currentCallId.current,
          })
        } else if (emitMode === "accept-call") {
          socket.emit("accept-call", {
            to: userId,
            signal,
            callId: currentCallId.current,
          })
        } else {
          socket.emit("webrtc-signal", {
            to: userId,
            signal,
            callId: currentCallId.current,
          })
        }
      })

      peer.on("stream", (remoteStream) => {
        setRemoteStreams((prev) => {
          const newMap = new Map(prev)
          newMap.set(userId, remoteStream)
          return newMap
        })
      })

      peer.on("connect", () => {
        console.log(`Peer connection established with ${userId}`)
      })

      peer.on("error", (error) => {
        console.error(`Peer connection error with ${userId}:`, error)
        setTimeout(() => {
          if (peersRef.current.has(userId)) {
            // Recria para reconexão: sinais fluem via webrtc-signal (renovação de sessão),
            // sem disparar call-user/incoming-call novamente
            const newPeer = createPeer(userId, initiator, stream, "webrtc-signal", callType)
            peersRef.current.set(userId, newPeer)
          }
        }, 2000)
      })

      peer.on("close", () => {
        console.log(`Peer connection closed with ${userId}`)
        setRemoteStreams((prev) => {
          const newMap = new Map(prev)
          newMap.delete(userId)
          return newMap
        })
        peersRef.current.delete(userId)
      })

      peersRef.current.set(userId, peer)
      return peer
    },
    [currentUserId, currentUserName]
  )

  const startCall = useCallback(
    async (userId: string, userName: string) => {
      const stream = await getUserMedia("video")
      if (!stream) {
        alert("Não foi possível acessar a câmera e microfone. Verifique as permissões.")
        return
      }

      currentCallId.current = `${currentUserId}-${userId}-${Date.now()}`
      createPeer(userId, true, stream, "call-user", "video")

      setIsCallActive(true)
      setParticipantsWithRef([{ userId, name: userName }])
    },
    [currentUserId, currentUserName, getUserMedia, createPeer, setParticipantsWithRef],
  )

  const startCallWithType = useCallback(
    async (userId: string, userName: string, callType: "audio" | "video") => {
      const stream = await getUserMedia(callType)
      if (!stream) {
        alert(`Não foi possível acessar ${callType === "video" ? "a câmera e " : ""}o microfone. Verifique as permissões.`)
        return
      }

      currentCallId.current = `${currentUserId}-${userId}-${Date.now()}`
      createPeer(userId, true, stream, "call-user", callType)

      setIsCallActive(true)
      setParticipantsWithRef([{ userId, name: userName }])
    },
    [currentUserId, currentUserName, getUserMedia, createPeer, setParticipantsWithRef],
  )

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return

    const callType = incomingCall.callType || "video"
    const stream = await getUserMedia(callType)
    if (!stream) {
      alert(`Não foi possível acessar ${callType === "video" ? "a câmera e " : ""}o microfone. Verifique as permissões.`)
      return
    }

    currentCallId.current = incomingCall.callId
    const peer = createPeer(incomingCall.from, false, stream, "accept-call")

    // CRÍTICO: o simple-peer com initiator:false PRECISA receber a oferta do chamador
    // via peer.signal(). Sem isso ele nunca gera a resposta e a chamada fica travada
    // em "conectando..." para sempre.
    if (incomingCall.signal) {
      try {
        peer.signal(incomingCall.signal)
      } catch (error) {
        console.error("Erro ao aplicar a oferta recebida:", error)
        // Sem oferta válida não há conexão possível — avisa o chamador e encerra
        const socket = socketService.getSocket()
        if (socket?.connected) {
          socket.emit("reject-call", {
            to: incomingCall.from,
            callId: incomingCall.callId,
          })
        }
        endCall()
        return
      }
    }

    setIsCallActive(true)
    setParticipantsWithRef([{ userId: incomingCall.from, name: incomingCall.callerName }])
    setIncomingCall(null)
    startCallTimer()
  }, [incomingCall, getUserMedia, createPeer, startCallTimer, endCall, setParticipantsWithRef])

  const rejectCall = useCallback(() => {
    if (!incomingCall) return

    const socket = socketService.getSocket()
    if (socket?.connected) {
      socket.emit("reject-call", {
        to: incomingCall.from,
        callId: incomingCall.callId,
      })
    }

    setIncomingCall(null)
  }, [incomingCall])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }, [])

  const addParticipant = useCallback(
    (userId: string, userName: string) => {
      const socket = socketService.getSocket()
      if (socket?.connected) {
        socket.emit("invite-to-call", {
          to: userId,
          from: currentUserId,
          callId: currentCallId.current,
          callerName: currentUserName,
        })
      }
    },
    [currentUserId, currentUserName],
  )

  // Cleanup on unmount — endCall agora é estável, não causa loop
  useEffect(() => {
    return () => {
      endCall()
    }
  }, [endCall])

  return {
    localStream,
    remoteStreams,
    isCallActive,
    isMuted,
    isVideoEnabled,
    callDuration,
    participants,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    addParticipant,
    incomingCall,
    startCallWithType,
    connectionStatus,
  }
}
