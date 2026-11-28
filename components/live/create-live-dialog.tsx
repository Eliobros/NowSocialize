// Modal de criar live: formulário + entrega da streamKey para o dono.
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Copy, Check, Eye, EyeOff, Loader2, Radio } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

const RTMP_URL = process.env.NEXT_PUBLIC_LIVE_RTMP_URL || ""

interface CreateLiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLiveCreated: (liveId: string) => void
}

export function CreateLiveDialog({ open, onOpenChange, onLiveCreated }: CreateLiveDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [streamKey, setStreamKey] = useState<string | null>(null)
  const [liveId, setLiveId] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setTitle("")
    setDescription("")
    setCreating(false)
    setError("")
    setStreamKey(null)
    setLiveId(null)
    setShowKey(false)
    setCopied(false)
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleCreate = async () => {
    setError("")
    if (title.trim().length < 3) {
      setError("O título deve ter pelo menos 3 caracteres.")
      return
    }

    setCreating(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/live", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      })
      const data = await response.json()

      if (response.status === 409 && data.liveId) {
        setError("Já tens uma transmissão ativa.")
        setLiveId(data.liveId)
        return
      }

      if (!response.ok || !data.success) {
        setError(data.message || "Não foi possível criar a transmissão.")
        return
      }

      setLiveId(data.live.id)
      setStreamKey(data.streamKey)
      onLiveCreated(data.live.id)
    } catch {
      setError("Erro de conexão. Tenta novamente.")
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast({ title: "Copiado!", description: "Chave copiada para a área de transferência." })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Falha ao copiar", description: "Copia manualmente.", variant: "destructive" })
    }
  }

  const maskedKey = streamKey ? `${streamKey.slice(0, 6)}${"•".repeat(Math.max(streamKey.length - 10, 8))}${streamKey.slice(-4)}` : ""

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            {streamKey ? "A tua Live foi criada!" : "Criar Live"}
          </DialogTitle>
        </DialogHeader>

        {!streamKey ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="live-title">Título</Label>
              <Input
                id="live-title"
                placeholder="Ex: Conversa de sexta à noite"
                value={title}
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="live-description">Descrição (opcional)</Label>
              <Textarea
                id="live-description"
                placeholder="Sobre o que vai ser a live?"
                value={description}
                maxLength={500}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-500">{error}</p>
                {liveId && (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/live/${liveId}`)}>
                    Abrir a minha live ativa
                  </Button>
                )}
              </div>
            )}
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar transmissão
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Configura estes dados no OBS (Transmissão → Personalizado) para entrares ao vivo.
            </p>
            <div className="flex flex-col gap-2">
              <Label>Servidor RTMP</Label>
              <div className="flex gap-2">
                <Input readOnly value={RTMP_URL || "Servidor de mídia ainda em configuração"} className="font-mono text-xs" />
                {RTMP_URL && (
                  <Button size="icon" variant="outline" onClick={() => handleCopy(RTMP_URL)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Chave de transmissão (secreta)</Label>
              <div className="flex gap-2">
                <Input readOnly value={showKey ? streamKey : maskedKey} className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={() => setShowKey((s) => !s)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleCopy(streamKey)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-600">
                Nunca partilhes esta chave: quem a tem pode transmitir como se fosses tu.
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => liveId && router.push(`/live/${liveId}`)}>
                Abrir a minha live
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
