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
  } | null>(null)

  const peersRef = useRef<Map<string, Peer.Instance>>(new Map())
  const callTimerRef = useRef<NodeJS.Timeout>()
  const currentCallId = useRef<string>("")
  const callStartTime = useRef<number>(0)
  const activityTimerRef = useRef<NodeJS.Timeout>()

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
      setIncomingCall(data)
    })

    socket.on("call-accepted", (data) => {
      const peer = peersRef.current.get(data.callId)
      if (peer) {
        peer.signal(data.signal)
      }
      // Iniciar timer quando a chamada for aceita
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

    // Listen for user status changes
    socket.on("user-status-changed", (data) => {
      // You can emit this to parent components if needed
      console.log("User status changed:", data)
    })

    // Set up activity timer to keep user online
    activityTimerRef.current = setInterval(() => {
      sendUserActivity()
    }, 30000) // Send activity every 30 seconds

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
      
      // Mark as offline when component unmounts
      updateOnlineStatus(false)
    }
  }, [currentUserId, updateOnlineStatus, sendUserActivity])

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
      setLocalStream(stream)
      setIsVideoEnabled(callType === "video")
      return stream
    } catch (error) {
      console.error("Erro ao acessar dispositivos de mídia:", error)
      
      // Fallback: tentar apenas áudio se vídeo falhar
      if (callType === "video") {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          setLocalStream(audioStream)
          setIsVideoEnabled(false)
          return audioStream
        } catch (audioError) {
          console.error("Erro ao acessar áudio:", audioError)
        }
      }
      
      return null
    }
  }, [])

  const createPeer = useCallback(
    (userId: string, initiator: boolean, stream: MediaStream) => {
      const peer = new Peer({
        initiator,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ],
        },
      })

      peer.on("signal", (signal) => {
        const socket = socketService.getSocket()
        if (socket?.connected) {
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
        // Tentar reconectar em caso de erro
        setTimeout(() => {
          if (peersRef.current.has(userId)) {
            const newPeer = createPeer(userId, initiator, stream)
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
    []
  )

  const startCall = useCallback(
    async (userId: string, userName: string) => {
      const stream = await getUserMedia("video")
      if (!stream) {
        alert("Não foi possível acessar a câmera e microfone. Verifique as permissões.")
        return
      }

      currentCallId.current = `${currentUserId}-${userId}-${Date.now()}`
      const peer = createPeer(userId, true, stream)

      peer.on("signal", (signal) => {
        const socket = socketService.getSocket()
        if (socket?.connected) {
          socket.emit("call-user", {
            to: userId,
            from: currentUserId,
            signal,
            callerName: currentUserName,
            callType: "video",
          })
        }
      })

      setIsCallActive(true)
      setParticipants([{ userId, name: userName }])
    },
    [currentUserId, currentUserName, getUserMedia, createPeer],
  )

  const startCallWithType = useCallback(
    async (userId: string, userName: string, callType: "audio" | "video") => {
      const stream = await getUserMedia(callType)
      if (!stream) {
        alert(`Não foi possível acessar ${callType === "video" ? "a câmera e " : ""}o microfone. Verifique as permissões.`)
        return
      }

      currentCallId.current = `${currentUserId}-${userId}-${Date.now()}`
      const peer = createPeer(userId, true, stream)

      peer.on("signal", (signal) => {
        const socket = socketService.getSocket()
        if (socket?.connected) {
          socket.emit("call-user", {
            to: userId,
            from: currentUserId,
            signal,
            callerName: currentUserName,
            callType,
          })
        }
      })

      setIsCallActive(true)
      setParticipants([{ userId, name: userName }])
    },
    [currentUserId, currentUserName, getUserMedia, createPeer],
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
    const peer = createPeer(incomingCall.from, false, stream)

    peer.on("signal", (signal) => {
      const socket = socketService.getSocket()
      if (socket?.connected) {
        socket.emit("accept-call", {
          to: incomingCall.from,
          signal,
          callId: incomingCall.callId,
        })
      }
    })

    setIsCallActive(true)
    setParticipants([{ userId: incomingCall.from, name: incomingCall.callerName }])
    setIncomingCall(null)
    startCallTimer()
  }, [incomingCall, getUserMedia, createPeer, startCallTimer])

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

  const endCall = useCallback(() => {
    // Notify other participants
    participants.forEach((participant) => {
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

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }

    // Reset state
    setIsCallActive(false)
    setRemoteStreams(new Map())
    setParticipants([])
    setIncomingCall(null)
    stopCallTimer()
    currentCallId.current = ""
  }, [participants, localStream, stopCallTimer])

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [localStream])

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }, [localStream])

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

  // Cleanup on unmount
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
