// Player HLS da live: hls.js onde precisa, <video> nativo onde dá (Safari),
// e estados limpos para waiting / ended / sem servidor de mídia / sem sinal.
"use client"

import { useEffect, useRef, useState } from "react"
import type Hls from "hls.js"
import { RadioTower, VideoOff, RefreshCw, Loader2, Satellite } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LiveStatus } from "@/components/live/types"

interface LivePlayerProps {
  status: LiveStatus
  playbackUrl?: string | null
}

type PlayerState = "loading" | "playing" | "error"

function PlayerFallback({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-3 bg-black p-8 text-center md:min-h-[420px]">
      {icon}
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="max-w-md text-sm text-neutral-400">{description}</p>
      {action}
    </div>
  )
}

export function LivePlayer({ status, playbackUrl }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playerState, setPlayerState] = useState<PlayerState>("loading")
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (status !== "live" || !playbackUrl) return
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null
    let cancelled = false
    setPlayerState("loading")

    const attach = async () => {
      // Safari / iOS: HLS nativo, sem biblioteca.
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playbackUrl
        video.play().catch(() => {
          // Autoplay bloqueado: mostra o player e o usuário dá play.
          if (!cancelled) setPlayerState("playing")
        })
        return
      }

      try {
        const { default: HlsLib } = await import("hls.js")
        if (cancelled) return

        if (HlsLib.isSupported()) {
          hls = new HlsLib({ maxBufferLength: 30 })
          hls.loadSource(playbackUrl)
          hls.attachMedia(video)
          video.play().catch(() => {})
        } else if (!cancelled) {
          setPlayerState("error")
        }
      } catch {
        if (!cancelled) setPlayerState("error")
      }
    }

    const onPlaying = () => {
      if (!cancelled) setPlayerState("playing")
    }
    const onError = () => {
      if (!cancelled) setPlayerState("error")
    }

    video.addEventListener("playing", onPlaying)
    video.addEventListener("error", onError)
    attach()

    return () => {
      cancelled = true
      video.removeEventListener("playing", onPlaying)
      video.removeEventListener("error", onError)
      hls?.destroy()
    }
  }, [status, playbackUrl, retryKey])

  if (status === "waiting") {
    return (
      <div className="overflow-hidden rounded-xl border">
        <PlayerFallback
          icon={<RadioTower className="h-12 w-12 text-amber-400" />}
          title="A live ainda não começou"
          description="O streamer está preparando a transmissão. Fica por aqui — o vídeo entra automaticamente."
        />
      </div>
    )
  }

  if (status === "ended") {
    return (
      <div className="overflow-hidden rounded-xl border">
        <PlayerFallback
          icon={<VideoOff className="h-12 w-12 text-neutral-500" />}
          title="Transmissão terminada"
          description="Esta live já terminou. Explora outras lives ao vivo."
        />
      </div>
    )
  }

  if (!playbackUrl) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <PlayerFallback
          icon={<Satellite className="h-12 w-12 text-sky-400" />}
          title="Vídeo disponível em breve"
          description="A live está no ar, mas o servidor de mídia ainda está em configuração. O chat e a contagem de espectadores já funcionam."
        />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        className="aspect-video w-full"
      />
      {playerState === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm text-neutral-300">A ligar ao sinal…</p>
        </div>
      )}
      {playerState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <VideoOff className="h-10 w-10 text-neutral-400" />
          <p className="font-semibold text-white">Sem sinal no momento</p>
          <p className="max-w-sm text-sm text-neutral-400">
            Não foi possível carregar o vídeo. Pode ser instabilidade do streamer ou do servidor de mídia.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setRetryKey((k) => k + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  )
}
