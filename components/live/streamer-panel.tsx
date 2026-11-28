// Painel do dono: RTMP + streamKey, status e botões manuais (fallback).
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Copy, Check, Eye, EyeOff, Loader2, Play, Square } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { LiveStatus } from "@/components/live/types"

const RTMP_URL = process.env.NEXT_PUBLIC_LIVE_RTMP_URL || ""

interface StreamerPanelProps {
  liveId: string
  status: LiveStatus
  onStatusChange: (status: LiveStatus) => void
}

export function StreamerPanel({ liveId, status, onStatusChange }: StreamerPanelProps) {
  const [streamKey, setStreamKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<"start" | "end" | null>(null)

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`/api/live/${liveId}/stream-key`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (response.ok && data.success) {
          setStreamKey(data.streamKey)
        }
      } catch {
        // Painel mostra o resto mesmo sem a chave
      }
    }
    fetchKey()
  }, [liveId])

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast({ title: "Copiado!", description: `${label} copiado.` })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Falha ao copiar", variant: "destructive" })
    }
  }

  const handleStart = async () => {
    setBusy("start")
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/live/${liveId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        onStatusChange("live")
        toast({ title: "Estás ao vivo!", description: data.message })
      } else {
        toast({ title: "Não foi possível iniciar", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const handleEnd = async () => {
    setBusy("end")
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/live/${liveId}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        onStatusChange("ended")
        toast({ title: "Live terminada", description: data.message })
      } else {
        toast({ title: "Não foi possível terminar", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const maskedKey = streamKey
    ? `${streamKey.slice(0, 6)}${"•".repeat(Math.max(streamKey.length - 10, 8))}${streamKey.slice(-4)}`
    : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          Painel do streamer
          <Badge variant={status === "live" ? "destructive" : status === "waiting" ? "secondary" : "outline"}>
            {status === "live" ? "AO VIVO" : status === "waiting" ? "A aguardar" : "Terminada"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Servidor RTMP (OBS → Personalizado)</Label>
          <div className="flex gap-2">
            <Input readOnly value={RTMP_URL || "Servidor de mídia ainda em configuração"} className="font-mono text-xs" />
            {RTMP_URL && (
              <Button size="icon" variant="outline" onClick={() => handleCopy(RTMP_URL, "Servidor")}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Chave de transmissão (secreta)</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={streamKey ? (showKey ? streamKey : maskedKey) : "A carregar…"}
              className="font-mono text-xs"
            />
            {streamKey && (
              <>
                <Button size="icon" variant="outline" onClick={() => setShowKey((s) => !s)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleCopy(streamKey, "Chave")}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {status !== "ended" && (
          <div className="flex gap-2">
            {status === "waiting" && (
              <Button onClick={handleStart} disabled={busy !== null} className="flex-1">
                {busy === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Entrar ao vivo (manual)
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={busy !== null} className={status === "waiting" ? "" : "flex-1"}>
                  {busy === "end" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                  Terminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminar a transmissão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os espectadores serão avisados na hora e a live não poderá ser retomada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEnd}>Terminar live</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Normalmente o início e o fim são automáticos quando ligas/desligas o OBS. Usa estes botões só se precisares.
        </p>
      </CardContent>
    </Card>
  )
}
