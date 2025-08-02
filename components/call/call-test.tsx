"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Video, Mic, Wifi, WifiOff } from "lucide-react"

interface CallTestProps {
  currentUserId: string
  currentUserName: string
}

export function CallTest({ currentUserId, currentUserName }: CallTestProps) {
  const [targetUserId, setTargetUserId] = useState("")
  const [targetUserName, setTargetUserName] = useState("")

  const handleStartCall = (callType: "audio" | "video") => {
    if (!targetUserId || !targetUserName) {
      alert("Por favor, preencha o ID e nome do usuário")
      return
    }

    if (typeof window !== "undefined" && (window as any).startCall) {
      ;(window as any).startCall(targetUserId, targetUserName, callType)
    } else {
      alert("Sistema de chamadas não está disponível")
    }
  }

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-500" />
      case "connecting":
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
      case "disconnected":
      case "error":
        return <WifiOff className="h-4 w-4 text-red-500" />
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Teste de WebRTC
          <Badge variant="outline">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">ID do Usuário Destino</label>
          <Input
            placeholder="Ex: user123"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome do Usuário Destino</label>
          <Input
            placeholder="Ex: João Silva"
            value={targetUserName}
            onChange={(e) => setTargetUserName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Seu ID: {currentUserId}</label>
          <label className="text-sm font-medium">Seu Nome: {currentUserName}</label>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => handleStartCall("audio")} 
            className="flex-1"
            variant="outline"
          >
            <Mic className="h-4 w-4 mr-2" />
            Áudio
          </Button>
          <Button 
            onClick={() => handleStartCall("video")} 
            className="flex-1"
            variant="outline"
          >
            <Video className="h-4 w-4 mr-2" />
            Vídeo
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Certifique-se de que ambos os usuários estão online</p>
          <p>• Permita acesso à câmera e microfone quando solicitado</p>
          <p>• Use navegadores modernos (Chrome, Firefox, Safari)</p>
        </div>
      </CardContent>
    </Card>
  )
}