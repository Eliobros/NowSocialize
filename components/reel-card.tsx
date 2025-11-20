"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Heart, MessageCircle, Share, CheckCircle, Volume2, VolumeX, X } from "lucide-react"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"

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

interface ReelCardProps {
  reel: Reel
  onReelViewed: (reelId: string) => void
  isActive?: boolean
}

export function ReelCard({ reel, onReelViewed, isActive = false }: ReelCardProps) {
  const [liked, setLiked] = useState(reel.likedByUser)
  const [likeCount, setLikeCount] = useState(reel.likes || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Controlar reprodução baseado no isActive
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isActive && isPlaying) {
      video.play().catch(console.error)
    } else {
      video.pause()
    }

    // Cleanup quando não é mais ativo
    if (!isActive) {
      video.pause()
      video.currentTime = 0
      setIsPlaying(false)
    }

    return () => {
      video.pause()
      video.currentTime = 0
    }
  }, [isActive, isPlaying])

  // Controlar play/pause manual
  useEffect(() => {
    if (videoRef.current && isActive) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error)
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, isActive])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const togglePlayPause = () => {
    if (!isActive) return
    setIsPlaying(!isPlaying)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleLike = async () => {
    if (isLiking) return

    setIsLiking(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/reels/${reel._id}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLiked(data.liked)
        setLikeCount(data.likes)
      }
    } catch (error) {
      console.error("Error liking reel:", error)
    } finally {
      setIsLiking(false)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted
      videoRef.current.muted = newMutedState
      setIsMuted(newMutedState)
    }
  }

  const handleShare = async (platform: string) => {
    if (typeof window === "undefined") return

    const reelUrl = `${window.location.origin}/reels/${reel._id}`
    const text = `Confira este reel no SocializeNow: ${reel.content.substring(0, 100)}...`

    try {
      switch (platform) {
        case "copy":
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(reelUrl)
            alert("Link copiado!")
          } else {
            alert("Funcionalidade de copiar não suportada neste navegador.")
          }
          break
        case "whatsapp":
          window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + reelUrl)}`)
          break
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(reelUrl)}`,
          )
          break
        case "facebook":
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reelUrl)}`)
          break
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error)
      alert("Erro ao tentar compartilhar o link.")
    }
  }

  return (
    <Card className="w-full h-full flex flex-col bg-black text-white rounded-none border-none overflow-hidden">
      <CardContent className="flex-1 p-0 relative w-full h-full">
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="w-full h-full object-cover cursor-pointer"
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          onClick={togglePlayPause}
          onPlay={() => {
            setIsPlaying(true)
            if (!reel.viewedByUser) {
              onReelViewed(reel._id)
            }
          }}
          onPause={() => setIsPlaying(false)}
        />

        {/* Controle de Som */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white bg-black/30 hover:bg-black/50 rounded-full"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>

        {/* Informações do Autor e Conteúdo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 mb-2 pointer-events-auto">
            <Avatar 
              className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
              onClick={() => setShowProfileModal(true)}
            >
              {reel.author.avatar ? (
                <AvatarImage src={reel.author.avatar || "/placeholder.svg"} alt={reel.author.name} />
              ) : null}
              <AvatarFallback className="bg-blue-600 text-white">{getInitials(reel.author.name)}</AvatarFallback>
            </Avatar>
            <div>
              <Link
                href={`/profile/${reel.author._id}`}
                className="font-semibold hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                {reel.author.name}
                {reel.author.isVerified && <CheckCircle className="h-4 w-4 text-blue-500" />}
              </Link>
              <p className="text-sm text-gray-300">@{reel.author.username}</p>
            </div>
          </div>
          {reel.content && (
            <p className="text-sm whitespace-pre-wrap break-words max-w-[80%]">
              {reel.content}
            </p>
          )}
        </div>

        {/* Botões de Interação Lateral */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-6">
          <Button
            variant="ghost"
            size="icon"
            className={`flex flex-col items-center justify-center gap-1 text-white ${liked ? "text-red-500" : "hover:text-red-500"} bg-black/30 hover:bg-black/50 rounded-full h-12 w-12`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={`h-7 w-7 ${liked ? "fill-current" : ""}`} />
            <span className="text-xs font-semibold">{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex flex-col items-center justify-center gap-1 text-white hover:text-blue-300 bg-black/30 hover:bg-black/50 rounded-full h-12 w-12"
            onClick={() => setShowCommentsModal(true)}
          >
            <MessageCircle className="h-7 w-7" />
            <span className="text-xs font-semibold">{reel.commentsCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex flex-col items-center justify-center gap-1 text-white hover:text-green-300 bg-black/30 hover:bg-black/50 rounded-full h-12 w-12"
            onClick={() => handleShare("copy")}
          >
            <Share className="h-7 w-7" />
            <span className="text-xs font-semibold">Share</span>
          </Button>
        </div>
      </CardContent>

      {/* Modal da Foto de Perfil */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-md mx-auto bg-white rounded-lg">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {reel.author.name}
              {reel.author.isVerified && <CheckCircle className="h-5 w-5 text-blue-500" />}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowProfileModal(false)}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            <div className="relative">
              {reel.author.avatar ? (
                <img 
                  src={reel.author.avatar} 
                  alt={reel.author.name}
                  className="w-48 h-48 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-48 h-48 rounded-full bg-blue-600 flex items-center justify-center text-white text-6xl font-bold border-4 border-gray-200">
                  {getInitials(reel.author.name)}
                </div>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900">{reel.author.name}</h3>
              <p className="text-gray-600">@{reel.author.username}</p>
            </div>
            <Link 
              href={`/profile/${reel.author._id}`}
              className="w-full"
              onClick={() => setShowProfileModal(false)}
            >
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Ver Perfil Completo
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Comentários */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="max-w-md mx-auto bg-white rounded-lg max-h-[80vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Comentários</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCommentsModal(false)}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-4 max-h-96 overflow-y-auto">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Funcionalidade de comentários será implementada em breve!</p>
              <p className="text-sm mt-2">Por enquanto você pode curtir e compartilhar este reel.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
