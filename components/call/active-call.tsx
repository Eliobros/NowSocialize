"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Phone, Mic, MicOff, Video, VideoOff, UserPlus, Maximize2 } from "lucide-react"

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
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onAddParticipant: () => void
}

export function ActiveCall({
  participants,
  localStream,
  remoteStreams,
  duration,
  isMuted,
  isVideoEnabled,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onAddParticipant,
}: ActiveCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const VideoStream = ({
    stream,
    name,
    isLocal = false,
  }: { stream?: MediaStream; name: string; isLocal?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
      }
    }, [stream])

    return (
      <div
        className={`relative rounded-lg overflow-hidden bg-gray-900 ${
          participants.length === 1 ? "aspect-video" : "aspect-square"
        }`}
      >
        {stream && isVideoEnabled ? (
          <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-600 text-white text-xl">{getInitials(name)}</AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {name} {isLocal && "(Você)"}
        </div>
        {isLocal && isMuted && (
          <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded">
            <MicOff className="h-4 w-4" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 bg-black z-50 flex flex-col ${isFullscreen ? "" : "p-4"}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div>
          <h2 className="text-xl font-semibold">
            {participants.length === 1 ? participants[0].name : `Chamada em grupo (${participants.length + 1})`}
          </h2>
          <p className="text-gray-300">{formatDuration(duration)}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="text-white hover:bg-white/20"
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        {participants.length === 1 ? (
          // One-on-one call layout
          <div className="h-full grid grid-cols-1 gap-4">
            <div className="relative">
              <VideoStream stream={remoteStreams.get(participants[0].userId)} name={participants[0].name} />
              {/* Local video overlay */}
              <div className="absolute top-4 right-4 w-32 h-24 md:w-48 md:h-36">
                <VideoStream stream={localStream || undefined} name="Você" isLocal />
              </div>
            </div>
          </div>
        ) : (
          // Group call layout
          <div
            className={`h-full grid gap-4 ${
              participants.length + 1 <= 4
                ? "grid-cols-2"
                : participants.length + 1 <= 9
                  ? "grid-cols-3"
                  : "grid-cols-4"
            }`}
          >
            <VideoStream stream={localStream || undefined} name="Você" isLocal />
            {participants.map((participant) => (
              <VideoStream
                key={participant.userId}
                stream={remoteStreams.get(participant.userId)}
                name={participant.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-6 bg-black/50">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          onClick={onToggleMute}
          className="rounded-full h-14 w-14 p-0"
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button
          variant={isVideoEnabled ? "secondary" : "destructive"}
          size="lg"
          onClick={onToggleVideo}
          className="rounded-full h-14 w-14 p-0"
        >
          {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        <Button variant="secondary" size="lg" onClick={onAddParticipant} className="rounded-full h-14 w-14 p-0">
          <UserPlus className="h-6 w-6" />
        </Button>

        <Button variant="destructive" size="lg" onClick={onEndCall} className="rounded-full h-14 w-14 p-0">
          <Phone className="h-6 w-6 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  )
}
