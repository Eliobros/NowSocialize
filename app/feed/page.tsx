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
import { Loader2, Plus, ImageIcon, X } from "lucide-react"

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
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
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
      <div className="md:hidden bg-white border-b border-gray-200">
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
        <Card className="mb-8 w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <Textarea
                placeholder="O que você está pensando?"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={3}
                className="resize-none"
              />
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
                <p className="text-gray-500">Nenhum post encontrado. Seja o primeiro a postar!</p>
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
