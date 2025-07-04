"use client"

import { useWebRTC } from "@/hooks/use-webrtc"
import { IncomingCall } from "./incoming-call"
import { ActiveCall } from "./active-call"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface CallManagerProps {
  currentUserId: string
  currentUserName: string
}

export function CallManager({ currentUserId, currentUserName }: CallManagerProps) {
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const {
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
  } = useWebRTC(currentUserId, currentUserName)

  const handleAddParticipant = () => {
    setShowAddParticipant(true)
  }

  const handleInviteUser = (userId: string, userName: string) => {
    addParticipant(userId, userName)
    setShowAddParticipant(false)
    setSearchTerm("")
  }

  // Adicione esta função para ser usada externamente
  const handleStartCall = (userId: string, userName: string, callType: "audio" | "video") => {
    startCallWithType(userId, userName, callType)
  }

  // Exponha a função via ref ou context
  useEffect(() => {
    // Armazenar referência global para uso externo
    if (typeof window !== "undefined") {
      ;(window as any).startCall = handleStartCall
    }
  }, [])

  return (
    <>
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCall callerName={incomingCall.callerName} onAccept={acceptCall} onReject={rejectCall} />
      )}

      {/* Active Call Interface */}
      {isCallActive && (
        <ActiveCall
          participants={participants}
          localStream={localStream}
          remoteStreams={remoteStreams}
          duration={callDuration}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onAddParticipant={handleAddParticipant}
        />
      )}

      {/* Add Participant Dialog */}
      <Dialog open={showAddParticipant} onOpenChange={setShowAddParticipant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Participante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Add user search results here */}
            <div className="text-center text-gray-500">Busque por usuários para adicionar à chamada</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
