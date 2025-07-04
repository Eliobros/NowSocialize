"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Share, Send, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

interface Post {
  _id: string
  content: string
  image?: string
  author: {
    name: string
    email: string
    _id: string
    avatar?: string
    isVerified?: boolean
  }
  createdAt: string
  likes: number
  likedByUser: boolean
  commentsCount: number
}

interface Comment {
  _id: string
  content: string
  createdAt: string
  author: {
    _id: string
    name: string
    avatar?: string
  }
}

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(post.likedByUser)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [comment, setComment] = useState("")
  const [isCommenting, setIsCommenting] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showCommentsDialog, setShowCommentsDialog] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
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

  useEffect(() => {
    if (showCommentsDialog) {
      fetchComments()
    }
  }, [showCommentsDialog])

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/posts/${post._id}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error("Erro ao carregar comentários:", error)
    }
  }

  const handleLike = async () => {
    if (isLiking) return

    setIsLiking(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/posts/${post._id}/like`, {
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
      console.error("Error liking post:", error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleComment = async () => {
    if (!comment.trim() || isCommenting) return

    setIsCommenting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/posts/${post._id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: comment }),
      })

      if (response.ok) {
        setComment("")
        setCommentCount((prev) => prev + 1)
        fetchComments()
      }
    } catch (error) {
      console.error("Error commenting:", error)
    } finally {
      setIsCommenting(false)
    }
  }

  const handleShare = async (platform: string) => {
    if (typeof window === "undefined") return

    const postUrl = `${window.location.origin}/post/${post._id}`
    const text = `Confira este post no SocializeNow: ${post.content.substring(0, 100)}...`

    try {
      switch (platform) {
        case "copy":
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(postUrl)
            alert("Link copiado!")
          } else {
            alert("Funcionalidade de copiar não suportada neste navegador.")
          }
          break
        case "whatsapp":
          window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + postUrl)}`)
          break
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(postUrl)}`,
          )
          break
        case "facebook":
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`)
          break
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error)
      alert("Erro ao tentar compartilhar o link.")
    }

    setShowShareDialog(false)
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {post.author.avatar ? (
              <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
            ) : null}
            <AvatarFallback className="bg-blue-600 text-white">{getInitials(post.author.name)}</AvatarFallback>
          </Avatar>
          <div>
            <Link
              href={`/profile/${post.author._id}`}
              className="font-semibold hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              {post.author.name}
              {post.author.isVerified && <CheckCircle className="h-4 w-4 text-blue-500" />}
            </Link>
            <p className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {post.content && <p className="mb-4 whitespace-pre-wrap break-words overflow-wrap-anywhere">{post.content}</p>}

        {post.image && (
          <div className="mb-4">
            <img
              src={post.image || "/placeholder.svg"}
              alt="Post image"
              className="w-full max-h-96 object-cover rounded-lg max-w-full"
            />
          </div>
        )}

        <div className="flex items-center gap-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${liked ? "text-red-600" : "text-muted-foreground hover:text-red-600"}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {likeCount}
          </Button>

          <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-blue-600">
                <MessageCircle className="h-4 w-4" />
                {commentCount > 0 ? `${commentCount} Comentário${commentCount > 1 ? "s" : ""}` : "Comentar"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Comentários</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c._id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-6 w-6">
                          {c.author.avatar ? (
                            <AvatarImage src={c.author.avatar || "/placeholder.svg"} alt={c.author.name} />
                          ) : null}
                          <AvatarFallback>{c.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <strong className="text-sm">{c.author.name}</strong>
                          <p className="text-sm mt-1">{c.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum comentário ainda seja o primeiro a comentar.</p>
                )}
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Escreva seu comentário..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleComment} disabled={!comment.trim() || isCommenting} className="w-full">
                  {isCommenting ? "Enviando..." : "Enviar Comentário"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-green-600">
                <Share className="h-4 w-4" />
                Partilhar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Compartilhar post</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => handleShare("copy")}>
                  Copiar Link
                </Button>
                <Button variant="outline" onClick={() => handleShare("whatsapp")}>
                  WhatsApp
                </Button>
                <Button variant="outline" onClick={() => handleShare("twitter")}>
                  Twitter
                </Button>
                <Button variant="outline" onClick={() => handleShare("facebook")}>
                  Facebook
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
