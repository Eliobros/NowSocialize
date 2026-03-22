"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Share, Send, X, MoreHorizontal, Trash2 } from "lucide-react"
import Link from "next/link"
import { VerifiedBadge } from "@/components/verified-badge"
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
    badgeType?: string
  }
  createdAt: string
  likes: number
  likedByUser: boolean
  commentsCount: number
  sharedPost?: {
    _id: string
    content: string
    image?: string
    createdAt: string
    author: {
      _id: string
      name: string
      avatar?: string
      isVerified?: boolean
      badgeType?: string
    }
  }
  sharesCount?: number
}

interface Comment {
  _id: string
  content: string
  createdAt: string
  parentCommentId?: string
  author: {
    _id: string
    name: string
    username?: string
    avatar?: string
  }
}

interface PostCardProps {
  post: Post
  currentUserId?: string
  onPostDeleted?: (postId: string) => void
}

export function PostCard({ post, currentUserId, onPostDeleted }: PostCardProps) {
  const [liked, setLiked] = useState(post.likedByUser)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [comment, setComment] = useState("")
  const [isCommenting, setIsCommenting] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showCommentsDialog, setShowCommentsDialog] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [shareCount, setShareCount] = useState(post.sharesCount || 0)
  const [isSharing, setIsSharing] = useState(false)
  const [shareText, setShareText] = useState("")

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
        body: JSON.stringify({ 
          content: replyingTo ? `@${replyingTo.author.username || replyingTo.author.name} ${comment}` : comment,
          parentCommentId: replyingTo?._id 
        }),
      })

      if (response.ok) {
        setComment("")
        setCommentCount((prev) => prev + 1)
        fetchComments()
        setReplyingTo(null)
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

  const handleInternalShare = async () => {
    if (isSharing) return
    setIsSharing(true)
    try {
      const token = localStorage.getItem("token")
      const sharePostId = post.sharedPost ? post.sharedPost._id : post._id
      const response = await fetch(`/api/posts/${sharePostId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: shareText }),
      })
      if (response.ok) {
        setShareCount((prev) => prev + 1)
        setShowShareDialog(false)
        setShareText("")
        alert("Post compartilhado no seu feed!")
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleDeletePost = async () => {
    setIsDeleting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/posts/${post._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setShowDeleteConfirm(false)
        onPostDeleted?.(post._id)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }))
        alert(`Erro ao deletar post: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Erro ao deletar post:", error)
      alert("Erro de conexão ao deletar post")
    } finally {
      setIsDeleting(false)
    }
  }

  const renderMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <Link key={i} href={`/search?q=${part.slice(1)}`} className="text-primary font-semibold hover:underline">
            {part}
          </Link>
        )
      }
      return part
    })
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar 
            className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
            onClick={() => setShowProfileModal(true)}
          >
            {post.author.avatar ? (
              <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
            ) : null}
            <AvatarFallback className="bg-blue-600 text-white">{getInitials(post.author.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Link
              href={`/profile/${post.author._id}`}
              className="font-semibold hover:text-blue-600 transition-colors flex items-center gap-1"
              onClick={() => console.log(`Navegando para perfil: ${post.author._id}`)}
            >
              {post.author.name}
              {post.author.isVerified && <VerifiedBadge type={(post.author.badgeType as any) || "verificado"} size={16} />}
            </Link>
            <p className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</p>
          </div>
          {/* Menu de opções - só aparece se for o autor do post */}
          {currentUserId === post.author._id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {post.content && <p className="mb-4 whitespace-pre-wrap break-words overflow-wrap-anywhere">{renderMentions(post.content)}</p>}

        {post.image && (
          <div className="mb-4">
            <img
              src={post.image || "/placeholder.svg"}
              alt="Post image"
              className="w-full max-h-96 object-cover rounded-lg max-w-full"
            />
          </div>
        )}

        {post.sharedPost && (
          <div className="mb-4 border border-border rounded-lg overflow-hidden bg-muted/30">
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  {post.sharedPost.author?.avatar && (
                    <AvatarImage src={post.sharedPost.author.avatar} alt={post.sharedPost.author.name} />
                  )}
                  <AvatarFallback className="text-[10px]">{getInitials(post.sharedPost.author?.name || "U")}</AvatarFallback>
                </Avatar>
                <Link href={`/profile/${post.sharedPost.author?._id}`} className="text-sm font-semibold hover:text-blue-600 flex items-center gap-1">
                  {post.sharedPost.author?.name}
                  {post.sharedPost.author?.isVerified && <VerifiedBadge type={(post.sharedPost.author.badgeType as any) || "verificado"} size={14} />}
                </Link>
                <span className="text-xs text-muted-foreground">{formatDate(post.sharedPost.createdAt)}</span>
              </div>
              {post.sharedPost.content && (
                <p className="text-sm whitespace-pre-wrap break-words mb-2">{post.sharedPost.content}</p>
              )}
              {post.sharedPost.image && (
                <img src={post.sharedPost.image} alt="Shared post" className="w-full max-h-60 object-cover rounded-md" />
              )}
            </div>
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
                  <>
                    {comments
                      .filter((c) => !c.parentCommentId)
                      .map((c) => (
                        <div key={c._id}>
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-start gap-2">
                              <Avatar className="h-6 w-6">
                                {c.author.avatar ? (
                                  <AvatarImage src={c.author.avatar || "/placeholder.svg"} alt={c.author.name} />
                                ) : null}
                                <AvatarFallback>{c.author.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-1">
                                  <strong className="text-sm">{c.author.name}</strong>
                                  {c.author.username && <span className="text-xs text-muted-foreground">@{c.author.username}</span>}
                                </div>
                                <p className="text-sm mt-1">{renderMentions(c.content)}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground mt-1"
                                  onClick={() => setReplyingTo(c)}
                                >
                                  Responder
                                </Button>
                              </div>
                            </div>
                          </div>
                          {/* Replies */}
                          {comments
                            .filter((r) => r.parentCommentId === c._id)
                            .map((reply) => (
                              <div key={reply._id} className="ml-8 mt-1 p-3 bg-muted/50 rounded-lg border-l-2 border-primary/30">
                                <div className="flex items-start gap-2">
                                  <Avatar className="h-5 w-5">
                                    {reply.author.avatar ? (
                                      <AvatarImage src={reply.author.avatar || "/placeholder.svg"} alt={reply.author.name} />
                                    ) : null}
                                    <AvatarFallback className="text-[10px]">{reply.author.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1">
                                      <strong className="text-xs">{reply.author.name}</strong>
                                      {reply.author.username && <span className="text-xs text-muted-foreground">@{reply.author.username}</span>}
                                    </div>
                                    <p className="text-xs mt-1">{renderMentions(reply.content)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum comentário ainda seja o primeiro a comentar.</p>
                )}
              </div>
              <div className="space-y-2">
                {replyingTo && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                    <span>Respondendo a <strong>{replyingTo.author.name}</strong></span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => setReplyingTo(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <Textarea
                  placeholder={replyingTo ? `Responder a ${replyingTo.author.name}...` : "Escreva seu comentário..."}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleComment} disabled={!comment.trim() || isCommenting} className="w-full">
                  {isCommenting ? "Enviando..." : replyingTo ? "Enviar Resposta" : "Enviar Comentário"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-green-600">
                <Share className="h-4 w-4" />
                {shareCount > 0 ? shareCount : "Partilhar"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Compartilhar post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Adicione um comentário ao compartilhar (opcional)..."
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleInternalShare} disabled={isSharing} className="w-full">
                  {isSharing ? "Compartilhando..." : "Compartilhar no Feed"}
                  <Share className="ml-2 h-4 w-4" />
                </Button>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Ou compartilhar externamente:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleShare("copy")}>
                      Copiar Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare("whatsapp")}>
                      WhatsApp
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare("twitter")}>
                      Twitter
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare("facebook")}>
                      Facebook
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
      
      {/* Modal da Foto de Perfil */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-md mx-auto rounded-lg">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {post.author.name}
              {post.author.isVerified && <VerifiedBadge type={(post.author.badgeType as any) || "verificado"} size={20} />}
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
              {post.author.avatar ? (
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name}
                  className="w-48 h-48 rounded-full object-cover border-4 border-border"
                />
              ) : (
                <div className="w-48 h-48 rounded-full bg-blue-600 flex items-center justify-center text-white text-6xl font-bold border-4 border-border">
                  {getInitials(post.author.name)}
                </div>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground">{post.author.name}</h3>
              <p className="text-muted-foreground">@{post.author.email}</p>
            </div>
            <Link 
              href={`/profile/${post.author._id}`}
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

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Tem certeza de que deseja excluir este post? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeletePost}
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
