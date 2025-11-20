"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Navbar } from "@/components/navbar"
import { ReelCard } from "@/components/reel-card"
import { CreateReelDialog } from "@/components/create-reel-dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Reel {
  _id: string
  videoUrl: string
  content: string
  author: {
    _id: string
    name: string
    username: string
    avatar?: string
    isVerified?: boolean
  }
  createdAt: string
  likes: number
  commentsCount: number
  likedByUser: boolean
  viewedByUser: boolean
  duration: number
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateReel, setShowCreateReel] = useState(false)
  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchReels()
  }, [])

  const fetchReels = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/reels", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setReels(data.reels)
      } else {
        setError("Erro ao carregar reels")
        toast({
          title: "Erro",
          description: "Erro ao carregar reels.",
          variant: "destructive",
        })
      }
    } catch (error) {
      setError("Erro de conexão")
      toast({
        title: "Erro",
        description: "Erro de conexão ao carregar reels.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scrollY = container.scrollTop
    const itemHeight = container.clientHeight

    const newIndex = Math.round(scrollY / itemHeight)
    if (newIndex !== currentReelIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentReelIndex(newIndex)
    }
  }, [currentReelIndex, reels.length])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  const handleReelViewed = async (reelId: string) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/reels/${reelId}/view`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setReels((prevReels) => prevReels.map((r) => (r._id === reelId ? { ...r, viewedByUser: true } : r)))
    } catch (error) {
      console.error("Erro ao registrar visualização do reel:", error)
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-white p-4 text-center">
          <p className="text-lg mb-4">Nenhum reel encontrado. Seja o primeiro a criar um!</p>
          <Button onClick={() => setShowCreateReel(true)} className="gap-2">
            <Plus className="h-5 w-5" />
            Criar Reel
          </Button>
        </div>
        <CreateReelDialog open={showCreateReel} onOpenChange={setShowCreateReel} onReelCreated={fetchReels} />
      </div>
    )
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <Navbar />
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ 
          height: "calc(100vh - 64px)",
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {reels.map((reel, index) => (
          <div 
            key={reel._id} 
            className="snap-start snap-always"
            style={{ height: "calc(100vh - 64px)" }}
          >
            <ReelCard 
              reel={reel} 
              onReelViewed={handleReelViewed} 
              isActive={index === currentReelIndex}
            />
          </div>
        ))}
      </div>
      
      {/* Botão de criar reel flutuante */}
      <div className="fixed bottom-24 right-6 z-50">
        <Button
          onClick={() => setShowCreateReel(true)}
          className="rounded-full h-14 w-14 shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all hover:scale-110"
          size="icon"
        >
          <Plus className="h-7 w-7 text-white" />
        </Button>
      </div>
      
      <CreateReelDialog open={showCreateReel} onOpenChange={setShowCreateReel} onReelCreated={fetchReels} />
    </div>
  )
}
