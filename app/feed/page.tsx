"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { PostCard } from "@/components/post-card"
import { StoriesSection } from "@/components/stories-section"
import { CreateStoryDialog } from "@/components/create-story-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, ImageIcon, X, Sparkles, Bot } from "lucide-react"

interface Post {
  _id: string
  content: string
  image?: string
  author: {
    name: string
    email: string
  }
  createdAt: string
  likes: number
}

// Adicione uma interface para os dados do usuário que você espera de /api/me
interface UserData {
  _id: string
  name: string
  email: string
  username: string
  userEmailVerified: boolean
  // Adicione outros campos que /api/me retorna
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<UserData | null>(null) // Armazena os dados completos do usuário
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [tinaSuggesting, setTinaSuggesting] = useState(false)
  const [tinaWelcome, setTinaWelcome] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionUsers, setMentionUsers] = useState<{ _id: string; name: string; username: string }[]>([])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionCursorPos, setMentionCursorPos] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchPosts()
    fetchUserData() // Chamada para buscar os dados do usuário
    fetchTinaWelcome()
  }, [router])

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts)
      } else {
        setError("Erro ao carregar posts")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data: UserData = await response.json()
        setUser(data) // Armazena os dados completos do usuário
      } else {
        console.error("Erro ao buscar dados do usuário:", response.statusText)
        setUser(null) // Limpa os dados do usuário em caso de erro
      }
    } catch (error) {
      console.error("Erro de conexão ao buscar dados do usuário:", error)
      setUser(null) // Limpa os dados do usuário em caso de erro de conexão
    }
  }

  const fetchTinaWelcome = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/tina/welcome", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        if (!data.alreadySent && data.message) {
          setTinaWelcome(data.message)
        }
      }
    } catch {}
  }

  const handleTinaSuggest = async (assunto: string) => {
    setTinaSuggesting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/tina/suggest-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assunto }),
      })
      if (response.ok) {
        const data = await response.json()
        setNewPost(data.suggestion)
      } else {
        setError("Tina não conseguiu gerar a sugestão. Tente novamente.")
      }
    } catch {
      setError("Erro ao conectar com a Tina")
    } finally {
      setTinaSuggesting(false)
    }
  }

  const searchMentionUsers = async (query: string) => {
    if (query.length < 1) {
      setMentionUsers([])
      setShowMentionDropdown(false)
      return
    }
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setMentionUsers(data.users || [])
        setShowMentionDropdown((data.users || []).length > 0)
      }
    } catch {
      setShowMentionDropdown(false)
    }
  }

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setNewPost(value)
    setMentionCursorPos(cursorPos)

    // Check if user is typing @mention
    const textBeforeCursor = value.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    if (mentionMatch) {
      const query = mentionMatch[1]
      setMentionQuery(query)
      searchMentionUsers(query)
    } else {
      setShowMentionDropdown(false)
      setMentionQuery("")
    }
  }

  const insertMention = (username: string) => {
    const textBeforeCursor = newPost.slice(0, mentionCursorPos)
    const textAfterCursor = newPost.slice(mentionCursorPos)
    const beforeMention = textBeforeCursor.replace(/@\w*$/, "")
    setNewPost(`${beforeMention}@${username} ${textAfterCursor}`)
    setShowMentionDropdown(false)
    setMentionQuery("")
  }

  const handlePostKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Trigger @Tina suggestion on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey && newPost.startsWith("@Tina")) {
      const tinaMatch = newPost.match(/@[Tt]ina\s+sugere?\s*(?:me\s+)?(?:um\s+)?(?:texto\s+)?(?:de\s+post\s+)?(?:sobre\s+)?(.+)/i)
      if (tinaMatch && tinaMatch[1]?.trim().length >= 3 && !tinaSuggesting) {
        e.preventDefault()
        handleTinaSuggest(tinaMatch[1].trim())
      }
    }
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione apenas arquivos de imagem")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5MB")
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handlePostDeleted = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post._id !== postId))
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim() && !selectedImage) return

    setPosting(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      if (selectedImage) {
        const formData = new FormData()
        formData.append("content", newPost)
        formData.append("image", selectedImage)

        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (response.ok) {
          setNewPost("")
          removeImage()
          fetchPosts()
        } else {
          setError("Erro ao criar post")
        }
      } else {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: newPost }),
        })

        if (response.ok) {
          setNewPost("")
          fetchPosts()
        } else {
          setError("Erro ao criar post")
        }
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background overflow-x-clip">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Navbar />
      {/* Use user?.userEmailVerified para acessar o status */}
      {!user?.userEmailVerified && (
        <Alert variant="destructive" className="mx-auto mt-6 max-w-2xl">
          <AlertDescription className="flex items-center justify-between">
            <span>Seu e-mail ainda não foi verificado. Verifique para aproveitar todos os recursos.</span>
            <Button
              onClick={async () => {
                setSendingEmail(true)
                setError("") // Limpa qualquer erro anterior
                if (!user?.email) {
                  setError(" Ops!, Email do usuário não disponível para reenviar link.")
                  setSendingEmail(false)
                  return
                }
                try {
                  const token = localStorage.getItem("token")
                  const response = await fetch("/api/send-verification-link", {
                    // <-- Endpoint corrigido
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ email: user.email }), // <-- Enviando o email no body
                  })
                  if (response.ok) {
                    setEmailSent(true)
                    setError("")
                  } else {
                    const errorData = await response.json()
                    setError(errorData.error || "Erro ao reenviar link de verificação.")
                  }
                } catch (err) {
                  setError("Erro de conexão ao enviar o link.")
                } finally {
                  setSendingEmail(false)
                }
              }}
              disabled={sendingEmail || emailSent}
              size="sm"
              variant="outline"
            >
              {sendingEmail ? "Enviando..." : emailSent ? "Link enviado!" : "Enviar o link"}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* Stories Section - Mobile */}
      <div className="md:hidden bg-card border-b border-border">
        <StoriesSection onCreateStory={() => setShowCreateStory(true)} />
      </div>
      <div className="container mx-auto px-4 py-8 max-w-2xl overflow-x-hidden">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {/* Stories Section - Desktop */}
        <div className="hidden md:block mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Stories</CardTitle>
            </CardHeader>
            <CardContent>
              <StoriesSection onCreateStory={() => setShowCreateStory(true)} />
            </CardContent>
          </Card>
        </div>
        {/* Tina Welcome Message */}
        {tinaWelcome && (
          <Card className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Tina</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{tinaWelcome}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTinaWelcome(null)}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="mb-8 w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder='O que você está pensando? (use @ para mencionar alguém)'
                  value={newPost}
                  onChange={handlePostChange}
                  onKeyDown={handlePostKeyDown}
                  rows={3}
                  className="resize-none"
                />
                {tinaSuggesting && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-blue-600">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    Tina está escrevendo...
                  </div>
                )}
                {showMentionDropdown && mentionUsers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {mentionUsers.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 transition-colors"
                        onClick={() => insertMention(u.username || u.name)}
                      >
                        <span className="font-medium text-sm">{u.name}</span>
                        {u.username && (
                          <span className="text-xs text-muted-foreground">@{u.username}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {imagePreview && (
                <div className="relative w-full">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-full max-h-64 object-cover rounded-lg max-w-full"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Foto
                  </Button>
                </div>
                <Button type="submit" disabled={posting || (!newPost.trim() && !selectedImage)}>
                  {posting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publicar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-6">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Nenhum post encontrado. Seja o primeiro a postar!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard 
                key={post._id} 
                post={post} 
                currentUserId={user?._id}
                onPostDeleted={handlePostDeleted}
              />
            ))
          )}
        </div>
      </div>
      <CreateStoryDialog
        open={showCreateStory}
        onOpenChange={setShowCreateStory}
        onStoryCreated={() => {
          // Refresh stories if needed
        }}
      />
    </div>
  )
}
