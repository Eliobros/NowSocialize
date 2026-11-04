"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Phone, Mic, MicOff, Video, VideoOff, UserPlus, Maximize2, Minimize2, Wifi, WifiOff, AlertCircle } from "lucide-react"

interface Participant {
  userId: string
  name: string
  stream?: MediaStream
}

interface ActiveCallProps {
  participants: Participant[]
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  duration: number
  isMuted: boolean
  isVideoEnabled: boolean
  connectionStatus?: "connecting" | "connected" | "disconnected" | "error"
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onAddParticipant: () => void
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// Detecta se o stream tem um vídeo ativo (câmera ligada)
function useHasVideo(stream?: MediaStream | null) {
  const [hasVideo, setHasVideo] = useState(false)

  useEffect(() => {
    if (!stream) {
      setHasVideo(false)
      return
    }

    const check = () =>
      setHasVideo(stream.getVideoTracks().some((t) => t.enabled && !t.muted && t.readyState === "live"))

    check()
    const tracks = stream.getVideoTracks()
    tracks.forEach((t) => {
      t.addEventListener("mute", check)
      t.addEventListener("unmute", check)
      t.addEventListener("ended", check)
    })
    stream.addEventListener("addtrack", check)
    stream.addEventListener("removetrack", check)

    return () => {
      tracks.forEach((t) => {
        t.removeEventListener("mute", check)
        t.removeEventListener("unmute", check)
        t.removeEventListener("ended", check)
      })
      stream.removeEventListener("addtrack", check)
      stream.removeEventListener("removetrack", check)
    }
  }, [stream])

  return hasVideo
}

interface TileProps {
  stream?: MediaStream | null
  name: string
  isLocal?: boolean
  isMuted?: boolean
  cameraOn?: boolean // para o local, vem de isVideoEnabled
  avatarSize?: "sm" | "lg"
  showLabel?: boolean
  className?: string
  onClick?: () => void
}

// Fica FORA do ActiveCall: se ficasse dentro, o React recriaria o <video> a cada render
function VideoTile({
  stream,
  name,
  isLocal = false,
  isMuted = false,
  cameraOn,
  avatarSize = "lg",
  showLabel = true,
  className = "",
  onClick,
}: TileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamHasVideo = useHasVideo(stream)
  const showVideo = !!stream && (cameraOn ?? streamHasVideo)

  useEffect(() => {
    const el = videoRef.current
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream
    }
  }, [stream])

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-slate-900 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {/* O <video> fica sempre montado para o áudio do outro lado nunca cortar */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`absolute inset-0 h-full w-full object-cover ${isLocal ? "-scale-x-100" : ""} ${
          showVideo ? "opacity-100" : "opacity-0"
        }`}
      />

      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar className={avatarSize === "lg" ? "h-28 w-28" : "h-12 w-12"}>
            <AvatarFallback
              className={`bg-blue-600 text-white ${avatarSize === "lg" ? "text-4xl" : "text-base"}`}
            >
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {showLabel && (
        <div className="absolute bottom-2 left-2 max-w-[70%] truncate rounded-md bg-black/50 px-2 py-1 text-sm text-white">
          {name}
        </div>
      )}

      {isLocal && isMuted && (
        <div className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-1 text-white">
          <MicOff className="h-3.5 w-3.5" />
        </div>
      )}

      {!stream && !isLocal && (
        <div className="absolute right-2 top-2 rounded-full bg-yellow-500 p-1 text-white">
          <AlertCircle className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

export function ActiveCall({
  participants,
  localStream,
  remoteStreams,
  duration,
  isMuted,
  isVideoEnabled,
  connectionStatus = "connected",
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onAddParticipant,
}: ActiveCallProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [swapped, setSwapped] = useState(false) // toque no PiP troca quem fica em tela cheia

  const isOneOnOne = participants.length === 1
  const callDisabled = connectionStatus === "disconnected" || connectionStatus === "error"

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {
      setIsFullscreen((v) => !v)
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const statusIcon = {
    connected: <Wifi className="h-4 w-4 text-green-500" />,
    connecting: <Wifi className="h-4 w-4 animate-pulse text-yellow-500" />,
    disconnected: <WifiOff className="h-4 w-4 text-red-500" />,
    error: <WifiOff className="h-4 w-4 text-red-500" />,
  }[connectionStatus]

  const statusText = {
    connected: "Conectado",
    connecting: "Conectando...",
    disconnected: "Desconectado",
    error: "Erro de conexão",
  }[connectionStatus]

  const remote = isOneOnOne ? participants[0] : null
  const remoteStream = remote ? remoteStreams.get(remote.userId) : undefined

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {/* ===== Vídeos ===== */}
      {isOneOnOne && remote ? (
        <>
          {/* Tela cheia: remoto (ou local, se trocado) */}
          {swapped ? (
            <VideoTile
              stream={localStream}
              name="Você"
              isLocal
              isMuted={isMuted}
              cameraOn={isVideoEnabled}
              showLabel={false}
              className="absolute inset-0"
            />
          ) : (
            <VideoTile stream={remoteStream} name={remote.name} className="absolute inset-0" />
          )}

          {/* PiP pequeno na frente */}
          <div
            className="absolute right-4 z-20"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 84px)" }}
          >
            {swapped ? (
              <VideoTile
                stream={remoteStream}
                name={remote.name}
                avatarSize="sm"
                showLabel={false}
                onClick={() => setSwapped(false)}
                className="h-36 w-24 rounded-xl shadow-lg ring-1 ring-white/20 md:h-48 md:w-36"
              />
            ) : (
              <VideoTile
                stream={localStream}
                name="Você"
                isLocal
                isMuted={isMuted}
                cameraOn={isVideoEnabled}
                avatarSize="sm"
                showLabel={false}
                onClick={() => setSwapped(true)}
                className="h-36 w-24 rounded-xl shadow-lg ring-1 ring-white/20 md:h-48 md:w-36"
              />
            )}
          </div>
        </>
      ) : (
        // Chamada em grupo
        <div
          className={`absolute inset-0 grid auto-rows-fr gap-2 p-2 ${
            participants.length + 1 <= 4 ? "grid-cols-2" : participants.length + 1 <= 9 ? "grid-cols-3" : "grid-cols-4"
          }`}
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 84px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 112px)",
          }}
        >
          <VideoTile
            stream={localStream}
            name="Você"
            isLocal
            isMuted={isMuted}
            cameraOn={isVideoEnabled}
            avatarSize="sm"
            className="rounded-xl"
          />
          {participants.map((p) => (
            <VideoTile
              key={p.userId}
              stream={remoteStreams.get(p.userId)}
              name={p.name}
              avatarSize="sm"
              className="rounded-xl"
            />
          ))}
        </div>
      )}

      {/* ===== Header (sobre o vídeo) ===== */}
      <div
        className="absolute inset-x-0 top-0 z-30 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent px-5 pb-8 text-white"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        <div>
          <h2 className="text-xl font-semibold">
            {remote ? remote.name : `Chamada em grupo (${participants.length + 1})`}
          </h2>
          <div className="flex items-center gap-2 text-gray-200">
            <span>{formatDuration(duration)}</span>
            <div className="flex items-center gap-1">
              {statusIcon}
              <span className="text-xs">{statusText}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
      </div>

      {/* ===== Controles (fixos embaixo, respeitando a barra do celular) ===== */}
      <div
        className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          onClick={onToggleMute}
          className="h-14 w-14 rounded-full p-0"
          disabled={callDisabled}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button
          variant={isVideoEnabled ? "secondary" : "destructive"}
          size="lg"
          onClick={onToggleVideo}
          className="h-14 w-14 rounded-full p-0"
          disabled={callDisabled}
        >
          {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={onAddParticipant}
          className="h-14 w-14 rounded-full p-0"
          disabled={callDisabled}
        >
          <UserPlus className="h-6 w-6" />
        </Button>

        <Button variant="destructive" size="lg" onClick={onEndCall} className="h-14 w-14 rounded-full p-0">
          <Phone className="h-6 w-6 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  )
}
