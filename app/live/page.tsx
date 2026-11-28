// /live — lives no ar + criar nova live.
"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Eye, Loader2, Radio } from "lucide-react"
import { CreateLiveDialog } from "@/components/live/create-live-dialog"

interface LiveListItem {
  id: string
  streamerName: string
  streamerAvatar?: string | null
  title: string
  status: string
  viewersCount: number
}

export default function LiveListPage() {
  const router = useRouter()
  const [lives, setLives] = useState<LiveListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchLives = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/live", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setLives(data.lives || [])
      }
    } catch (error) {
      console.error("Erro ao carregar lives:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchLives()
  }, [router, fetchLives])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Radio className="h-6 w-6 text-red-500" />
              Lives
            </h1>
            <p className="text-sm text-muted-foreground">Transmissões ao vivo agora</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova live
          </Button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : lives.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Radio className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">Nenhuma live no ar neste momento.</p>
              <Button onClick={() => setDialogOpen(true)}>Criar a primeira</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lives.map((live) => (
              <Card
                key={live.id}
                className="cursor-pointer transition hover:border-red-500/50"
                onClick={() => router.push(`/live/${live.id}`)}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="destructive" className="animate-pulse">AO VIVO</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {live.viewersCount}
                    </span>
                  </div>
                  <p className="mb-2 line-clamp-2 font-semibold">{live.title}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={live.streamerAvatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {(live.streamerName || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm text-muted-foreground">{live.streamerName}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateLiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onLiveCreated={fetchLives}
      />
    </div>
  )
}
