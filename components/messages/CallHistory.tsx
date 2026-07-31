"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Loader2, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, Video, History, Trash2 } from "lucide-react"

interface CallLog {
  _id: string
  userId: string
  peerId: string
  peerName: string
  type: "audio" | "video"
  status: "made" | "received" | "missed" | "rejected"
  callId: string
  startedAt?: string
  endedAt?: string | null
  duration?: number | null
}

interface CallHistoryProps {
  onSelectUser?: (userId: string, userName: string) => void
}

const STATUS_META: Record<CallLog["status"], { label: string; color: string; icon: React.ElementType }> = {
  made: { label: "Feita", color: "text-emerald-500", icon: PhoneOutgoing },
  received: { label: "Recebida", color: "text-blue-500", icon: PhoneIncoming },
  missed: { label: "Perdida", color: "text-red-500", icon: PhoneMissed },
  rejected: { label: "Rejeitada", color: "text-zinc-400", icon: PhoneOff },
}

export function CallHistory({ onSelectUser }: CallHistoryProps) {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCalls = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/calls", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setCalls(data.calls || [])
      }
    } catch (error) {
      console.error("Erro ao carregar chamadas:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalls()
    // Atualiza quando uma chamada termina (evento disparado pelo useWebRTC)
    const onRefresh = () => fetchCalls()
    window.addEventListener("call-history-refresh", onRefresh)
    return () => window.removeEventListener("call-history-refresh", onRefresh)
  }, [fetchCalls])

  const handleClear = async () => {
    try {
      const token = localStorage.getItem("token")
      await fetch("/api/calls", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      setCalls([])
    } catch (error) {
      console.error("Erro ao limpar histórico:", error)
    }
  }

  const handleCallBack = (log: CallLog, type: "audio" | "video") => {
    if (typeof window !== "undefined" && (window as any).startCall) {
      ;(window as any).startCall(log.peerId, log.peerName, type)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffInHours < 24) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
    if (diffInHours < 48) return "Ontem"
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  }

  const formatDuration = (sec?: number | null) => {
    if (!sec && sec !== 0) return ""
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <>
      {/* Header with clear button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground">
          {calls.length > 0 ? `${calls.length} registro${calls.length > 1 ? "s" : ""}` : "Histórico"}
        </p>
        {calls.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-red-500" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : calls.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm text-center">Nenhuma chamada registrada ainda</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="py-1">
            {calls.map((log) => {
              const meta = STATUS_META[log.status]
              const StatusIcon = meta.icon
              const duration = formatDuration(log.duration)
              return (
                <div
                  key={log._id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                    log.status === "missed" ? "bg-red-500/[0.03]" : ""
                  } hover:bg-muted/50`}
                  onClick={() => onSelectUser?.(log.peerId, log.peerName)}
                >
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(log.peerName || "?")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                      <p className="font-semibold text-foreground truncate text-sm">{log.peerName || "Usuário"}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] font-medium ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {log.type === "video" ? "Chamada de vídeo" : "Chamada de áudio"}
                        {duration && ` · ${duration}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-muted-foreground">{formatTime(log.startedAt)}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCallBack(log, "audio")
                        }}
                        title="Ligar"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCallBack(log, "video")
                        }}
                        title="Vídeo chamada"
                      >
                        <Video className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </>
  )
}
