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
  } | null
  startCallWithType: (userId: string, userName: string, callType: "audio" | "video") => void
}

export function useWebRTC(currentUserId: string, currentUserName: string): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [participants, setParticipants] = useState<CallUser[]>([])
  const [incomingCall, setIncomingCall] = useState<{
    from: string
    callerName: string
    callId: string
  } | null>(null)

  const peersRef = useRef<Map<string, Peer.Instance>>(new Map())
  const callTimerRef = useRef<NodeJS.Timeout>()
  const currentCallId = useRef<string>("")
useEffect(() => {
  const socket = socketService.connect(currentUserId)

  socket.on("incoming-call", (data) => {
    setIncomingCall(data)
  })

  socket.on("call-accepted", (data) => {
    const peer = peersRef.current.get(data.callId)
    if (peer) {
      peer.signal(data.signal)
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

  return () => {
    socket.off("incoming-call")
    socket.off("call-accepted")
    socket.off("call-rejected")
    socket.off("call-ended")
    socket.off("webrtc-signal")
  }
}, [currentUserId])

const startCallTimer = useCallback(() => {
  callTimerRef.current = setInterval(() => {
    setCallDuration((prev) => prev + 1)
  }, 1000)
}, [])

const stopCallTimer = useCallback(() => {
  if (callTimerRef.current) {
    clearInterval(callTimerRef.current)
    callTimerRef.current = undefined
  }
  setCallDuration(0)
}, [])

const getUserMedia = useCallback(async () => {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    console.warn("getUserMedia não está disponível neste ambiente.")
    return null
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })
    setLocalStream(stream)
    return stream
  } catch (error) {
    console.error("Erro ao acessar dispositivos de mídia:", error)
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
        ],
      },
    })

    peer.on("signal", (signal) => {
      const socket = socketService.getSocket()
      socket?.emit("webrtc-signal", {
        to: userId,
        signal,
        callId: currentCallId.current,
      })
    })

    peer.on("stream", (remoteStream) => {
      setRemoteStreams((prev) => {
        const newMap = new Map(prev)
        newMap.set(userId, remoteStream)
        return newMap
      })
    })

    peer.on("close", () => {
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
      const stream = await getUserMedia()
      if (!stream) return

      currentCallId.current = `${currentUserId}-${userId}-${Date.now()}`
      const peer = createPeer(userId, true, stream)

      peer.on("signal", (signal) => {
        const socket = socketService.getSocket()
        socket?.emit("call-user", {
          to: userId,
          from: currentUserId,
          signal,
          callerName: currentUserName,
        })
      })

      setIsCallActive(true)
      setParticipants([{ userId, name: userName }])
    },
    [currentUserId, currentUserName, getUserMedia, createPeer],
  )

  const startCallWithType = useCallback(
    async (userId: string, userName: string, callType: "audio" | "video") => {
      const stream = await getUserMedia()
      if (!stream) return

      // Se for chamada de áudio, desabilitar vídeo
      if (callType === "audio") {
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = false
          setIsVideoEnabled(false)
        }
      }

      currentCallId.current = `${currentUserId}-${userId}-${Date.now()}`
      const peer = createPeer(userId, true, stream)

      peer.on("signal", (signal) => {
        const socket = socketService.getSocket()
        socket?.emit("call-user", {
          to: userId,
          from: currentUserId,
          signal,
          callerName: currentUserName,
          callType,
        })
      })

      setIsCallActive(true)
      setParticipants([{ userId, name: userName }])
    },
    [currentUserId, currentUserName, getUserMedia, createPeer],
  )

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return

    const stream = await getUserMedia()
    if (!stream) return

    currentCallId.current = incomingCall.callId
    const peer = createPeer(incomingCall.from, false, stream)

    peer.on("signal", (signal) => {
      const socket = socketService.getSocket()
      socket?.emit("accept-call", {
        to: incomingCall.from,
        signal,
        callId: incomingCall.callId,
      })
    })

    setIsCallActive(true)
    setParticipants([{ userId: incomingCall.from, name: incomingCall.callerName }])
    setIncomingCall(null)
    startCallTimer()
  }, [incomingCall, getUserMedia, createPeer, startCallTimer])

  const rejectCall = useCallback(() => {
    if (!incomingCall) return

    const socket = socketService.getSocket()
    socket?.emit("reject-call", {
      to: incomingCall.from,
      callId: incomingCall.callId,
    })

    setIncomingCall(null)
  }, [incomingCall])

  const endCall = useCallback(() => {
    // Notify other participants
    participants.forEach((participant) => {
      const socket = socketService.getSocket()
      socket?.emit("end-call", {
        to: participant.userId,
        callId: currentCallId.current,
      })
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
      socket?.emit("invite-to-call", {
        to: userId,
        from: currentUserId,
        callId: currentCallId.current,
        callerName: currentUserName,
      })
    },
    [currentUserId, currentUserName],
  )

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
  }
}
