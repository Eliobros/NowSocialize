// /live/[id] — assistir (espectador) ou gerir (dono).
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Eye, Loader2 } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import { toast } from "@/components/ui/use-toast"
import { useLiveSocket } from "@/hooks/use-live-socket"
import { LivePlayer } from "@/components/live/live-player"
import { LiveChat } from "@/components/live/live-chat"
import { StreamerPanel } from "@/components/live/streamer-panel"
import type { LiveChatMessage, LiveInfo, LiveStatus } from "@/components/live/types"

const HLS_TEMPLATE = process.env.NEXT_PUBLIC_LIVE_HLS_TEMPLATE || ""

export default function LiveWatchPage() {
  const params = useParams()
  const router = useRouter()
  const liveId = params.id as string

  const [live, setLive] = useState<LiveInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentUserId, setCurrentUserId] = useState("")
  const [joined, setJoined] = useState(false)
  const [joinError, setJoinError] = useState("")
  const [viewersCount, setViewersCount] = useState(0)
  const [messages, setMessages] = useState<LiveChatMessage[]>([])

  const joinedRef = useRef(false)
  const joiningRef = useRef(false)
  const isOwner = !!live && !!currentUserId && live.streamerId === currentUserId

  const fetchLive = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/live/${liveId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setLive(data.live)
        setViewersCount(data.live.viewersCount ?? 0)
      } else if (response.status === 404) {
        setError("Transmissão não encontrada.")
      } else {
        setError(data.message || "Erro ao carregar transmissão.")
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }, [liveId])

  const fetchHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/live/${liveId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setMessages(data.messages || [])
      }
    } catch {
      // Chat em tempo real continua a funcionar sem histórico
    }
  }, [liveId])

  const doJoin = useCallback(
    async (socketId: string) => {
      if (joiningRef.current || joinedRef.current) return
      joiningRef.current = true
      setJoinError("")
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`/api/live/${liveId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ socketId }),
        })
        const data = await response.json()
        if (response.ok && data.success) {
          joinedRef.current = true
          setJoined(true)
          setViewersCount(data.viewersCount ?? 0)
        } else {
          setJoinError(data.message || "Não foi possível entrar na live.")
        }
      } catch {
        setJoinError("Erro de conexão ao entrar na live.")
      } finally {
        joiningRef.current = false
      }
    },
    [liveId]
  )

  const { socketId, sendLiveMessage, leaveRoom } = useLiveSocket({
    userId: currentUserId,
    liveId,
    onViewersUpdated: (data) => setViewersCount(data.viewersCount),
    onLiveEnded: () => {
      setLive((prev) => (prev ? { ...prev, status: "ended" as LiveStatus } : prev))
      setViewersCount(0)
      joinedRef.current = false
      setJoined(false)
    },
    onLiveMessage: (message) => {
      setMessages((prev) => [...prev.slice(-99), message])
    },
    onChatError: (reason) => {
      toast({
        title: "Mensagem não enviada",
        description: reason === "throttled" ? "Calma, envia mais devagar." : `Motivo: ${reason}`,
        variant: "destructive",
      })
    },
    onReconnect: () => {
      // socket.id mudou: re-faz o join (idempotente, atualiza o socketId)
      // e recarrega estado + histórico.
      joinedRef.current = false
      fetchLive()
      fetchHistory()
    },
  })

  // Init: auth + dados + histórico
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setCurrentUserId(payload.userId || payload.id || payload._id || "")
    } catch {
      console.error("Erro ao decodificar token")
    }
    fetchLive()
    fetchHistory()
  }, [router, fetchLive, fetchHistory])

  // Espectador entra quando: socket pronto + live no ar + não é dono.
  // O dono não ocupa vaga de espectador (só observa pela sala).
  useEffect(() => {
    if (socketId && live?.status === "live" && !isOwner && !joinedRef.current) {
      doJoin(socketId)
    }
  }, [socketId, live?.status, isOwner, doJoin])

  // Enquanto está em waiting, verifica de 10 em 10s se já começou
  // (cobre o auto-start via webhook mesmo com o socket fora do ar).
  useEffect(() => {
    if (live?.status !== "waiting") return
    const timer = setInterval(fetchLive, 10000)
    return () => clearInterval(timer)
  }, [live?.status, fetchLive])

  // Saída: avisa a sala e liberta a vaga (best-effort; o disconnect no
  // servidor faz o mesmo cleanup se isto falhar).
  useEffect(() => {
    return () => {
      leaveRoom()
      if (joinedRef.current) {
        const token = localStorage.getItem("token")
        fetch(`/api/live/${liveId}/leave`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          keepalive: true,
        }).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId])

  const playbackUrl = HLS_TEMPLATE ? HLS_TEMPLATE.replace("{liveId}", liveId) : null

  const chatCanSend =
    !!live && live.status === "live" && (isOwner || (joined && !joinError))

  const chatHint = !live
    ? ""
    : live.status === "ended"
      ? "A live terminou."
      : live.status === "waiting"
        ? "O chat abre quando a live começar."
        : joinError
          ? joinError
          : "A entrar na live…"

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !live) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <Button variant="ghost" onClick={() => router.push("/live")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar às lives
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-red-500">{error || "Transmissão não encontrada."}</p>
              <Button onClick={() => router.push("/live")}>Ver lives no ar</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Toaster />
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <Button variant="ghost" onClick={() => router.push("/live")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Lives
        </Button>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={live.streamerAvatar || undefined} />
            <AvatarFallback>{(live.streamerName || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{live.title}</h1>
            <p className="text-sm text-muted-foreground">{live.streamerName}</p>
          </div>
          <Badge
            variant={live.status === "live" ? "destructive" : live.status === "waiting" ? "secondary" : "outline"}
            className={live.status === "live" ? "animate-pulse" : ""}
          >
            {live.status === "live" ? "AO VIVO" : live.status === "waiting" ? "A AGUARDAR" : "TERMINADA"}
          </Badge>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            {viewersCount}
          </span>
        </div>

        {joinError && (
          <Card className="mb-4 border-amber-500/50">
            <CardContent className="py-3 text-sm text-amber-600">{joinError}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <LivePlayer status={live.status} playbackUrl={playbackUrl} />

            {live.description && (
              <Card>
                <CardContent className="py-4">
                  <p className="text-sm">{live.description}</p>
                </CardContent>
              </Card>
            )}

            {isOwner && (
              <StreamerPanel
                liveId={liveId}
                status={live.status}
                onStatusChange={(status) => {
                  setLive((prev) => (prev ? { ...prev, status } : prev))
                  if (status === "ended") setViewersCount(0)
                }}
              />
            )}
          </div>

          <Card className="h-[520px] lg:h-auto lg:min-h-[520px]">
            <LiveChat
              messages={messages}
              currentUserId={currentUserId}
              streamerId={live.streamerId}
              canSend={chatCanSend}
              sendHint={chatHint}
              onSend={sendLiveMessage}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
