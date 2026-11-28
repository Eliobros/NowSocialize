// Menu do botão + : criar reel / transmissão ao vivo (+ atalhos de exploração).
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Video, Radio, Clapperboard, Tv, ChevronRight } from "lucide-react"
import { CreateReelDialog } from "@/components/create-reel-dialog"
import { CreateLiveDialog } from "@/components/live/create-live-dialog"

interface CreateMenuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateMenuDialog({ open, onOpenChange }: CreateMenuDialogProps) {
  const router = useRouter()
  const [reelOpen, setReelOpen] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false)

  const close = () => onOpenChange(false)

  const options = [
    {
      icon: Video,
      label: "Criar Reel",
      description: "Publica um vídeo curto",
      onClick: () => {
        close()
        setReelOpen(true)
      },
    },
    {
      icon: Radio,
      label: "Transmitir ao vivo",
      description: "Inicia uma transmissão",
      accent: true,
      onClick: () => {
        close()
        setLiveOpen(true)
      },
    },
  ]

  const explore = [
    {
      icon: Clapperboard,
      label: "Ver Reels",
      onClick: () => {
        close()
        router.push("/reels")
      },
    },
    {
      icon: Tv,
      label: "Ver Lives",
      onClick: () => {
        close()
        router.push("/live")
      },
    },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Criar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className="flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${opt.accent ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
                  <opt.icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}

            <div className="flex items-center gap-2 px-3 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Explorar</span>
              <Separator className="flex-1" />
            </div>

            {explore.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className="flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
              >
                <opt.icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{opt.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CreateReelDialog
        open={reelOpen}
        onOpenChange={setReelOpen}
        onReelCreated={() => router.push("/reels")}
      />
      <CreateLiveDialog
        open={liveOpen}
        onOpenChange={setLiveOpen}
        onLiveCreated={() => {}}
      />
    </>
  )
}
