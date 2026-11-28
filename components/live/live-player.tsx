"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type Hls from "hls.js"
import {
  RadioTower,
  VideoOff,
  RefreshCw,
  Loader2,
  Satellite,
  Volume2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LiveStatus } from "@/components/live/types"

interface LivePlayerProps {
  status: LiveStatus
  webrtcUrl?: string | null
  hlsUrl?: string | null
}

type PlayerState =
  | "idle"
  | "connecting"
  | "playing"
  | "reconnecting"
  | "error"

const MAX_RETRIES = 3

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

export function LivePlayer({
  status,
  webrtcUrl,
  hlsUrl,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playerState, setPlayerState] = useState<PlayerState>("idle")
  const [transport, setTransport] = useState<"webrtc" | "hls" | null>(null)
  const [needsUnmute, setNeedsUnmute] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const startPlayback = useCallback((video: HTMLVideoElement) => {
    video
      .play()
      .then(() => setNeedsUnmute(false))
      .catch(() => setNeedsUnmute(true))
  }, [])

  useEffect(() => {
    if (status !== "live") {
      setPlayerState("idle")
      setTransport(null)
      return
    }

    if (!webrtcUrl && !hlsUrl) {
      setPlayerState("idle")
      setTransport(null)
      return
    }

    const video = videoRef.current
    if (!video) return

    let cancelled = false
    let hls: Hls | null = null
    let webrtcReader: { close: () => void } | null = null
    let retryCount = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    setPlayerState("connecting")
    setTransport(webrtcUrl ? "webrtc" : "hls")

    const cleanup = () => {
      if (retryTimer) clearTimeout(retryTimer)

      webrtcReader?.close()
      webrtcReader = null

      hls?.destroy()
      hls = null

      video.srcObject = null
      video.removeAttribute("src")
      video.load()
    }

    const scheduleRetry = () => {
      if (cancelled) return

      if (retryCount >= MAX_RETRIES) {
        setPlayerState("error")
        return
      }

      retryCount += 1
      setPlayerState("reconnecting")

      retryTimer = setTimeout(() => {
        if (!cancelled) setRetryKey((key) => key + 1)
      }, 1500 * retryCount)
    }

    const startWebRTC = async () => {
      if (!webrtcUrl) return false

      try {
        const reader = new (window as any).MediaMTXWebRTCReader({
          url: webrtcUrl,
          onError: () => {
            if (!cancelled) scheduleRetry()
          },
          onTrack: (event: RTCTrackEvent) => {
            if (cancelled) return

            const stream = event.streams[0]
            if (!stream) return

            video.srcObject = stream
            startPlayback(video)
          },
        })

        webrtcReader = reader
        return true
      } catch {
        return false
      }
    }

    const startHls = async () => {
      if (!hlsUrl) return false

      const canPlayNativeHls =
        video.canPlayType("application/vnd.apple.mpegurl") !== ""

      if (canPlayNativeHls) {
        video.src = hlsUrl

        const onCanPlay = () => {
          if (!cancelled) startPlayback(video)
        }

        const onPlaying = () => {
          if (!cancelled) setPlayerState("playing")
        }

        const onError = () => {
          if (!cancelled) scheduleRetry()
        }

        video.addEventListener("canplay", onCanPlay)
        video.addEventListener("playing", onPlaying)
        video.addEventListener("error", onError)

        return () => {
          video.removeEventListener("canplay", onCanPlay)
          video.removeEventListener("playing", onPlaying)
          video.removeEventListener("error", onError)
        }
      }

      try {
        const { default: HlsLib } = await import("hls.js")

        if (cancelled) return false

        if (!HlsLib.isSupported()) {
          return false
        }

        hls = new HlsLib({
          lowLatencyMode: true,
          maxBufferLength: 8,
          backBufferLength: 10,
        })

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) startPlayback(video)
        })

        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (!cancelled) setPlayerState("playing")
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (cancelled || !data.fatal) return

          if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError()
            return
          }

          cleanup()
          scheduleRetry()
        })

        hls.attachMedia(video)
        hls.loadSource(hlsUrl)

        return true
      } catch {
        return false
      }
    }

    const start = async () => {
      const webrtcStarted = await startWebRTC()

      if (webrtcStarted) return

      setTransport("hls")
      const hlsStarted = await startHls()

      if (!hlsStarted && !cancelled) {
        scheduleRetry()
      }
    }

    start()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [status, webrtcUrl, hlsUrl, retryKey, startPlayback])

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

  if (!webrtcUrl && !hlsUrl) {
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
        autoPlay
        muted
        playsInline
        preload="none"
        className="aspect-video w-full"
      />

      {needsUnmute && (
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current
            if (!video) return

            video.muted = false
            video.volume = 1
            video.play().catch(() => {})
            setNeedsUnmute(false)
          }}
          className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-black"
        >
          <Volume2 className="h-4 w-4" />
          Ativar som
        </button>
      )}

      {(playerState === "connecting" ||
        playerState === "reconnecting") && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm text-neutral-300">
            {playerState === "connecting"
              ? "A ligar ao sinal…"
              : "A reconectar à live…"}
          </p>
        </div>
      )}

      {playerState === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <VideoOff className="h-10 w-10 text-neutral-400" />
          <p className="font-semibold text-white">Sem sinal no momento</p>
          <p className="max-w-sm text-sm text-neutral-400">
            Não foi possível carregar o vídeo. Pode ser instabilidade do
            streamer ou do servidor de mídia.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setRetryKey((key) => key + 1)
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  )
}
