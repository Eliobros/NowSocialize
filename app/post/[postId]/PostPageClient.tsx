// app/post/[postId]/PostPageClient.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { PostCard } from "@/components/post-card"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default function PostPageClient({ params }: { params: { postId: string } }) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchPost()
  }, [params.postId, router])

  const fetchPost = async () => {
    try {
      const token = localStorage.getItem("token")
      console.log(`Buscando post: ${params.postId}`)

      const response = await fetch(`/api/posts/${params.postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Post carregado com sucesso:", data.post)
        setPost(data.post)
      } else if (response.status === 404) {
        setError("Post não encontrado")
      } else {
        const errorData = await response.json()
        console.error("Erro na resposta da API:", response.status, errorData)
        setError(errorData.error || "Erro ao carregar post")
      }
    } catch (error) {
      console.error("Erro ao buscar post:", error)
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Post não encontrado"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Botão Voltar */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Post Principal */}
        <div className="mb-8">
          <PostCard post={post} />
        </div>

        {/* Seção de posts relacionados ou sugestões */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Gostou deste post?</h3>
            <p className="text-muted-foreground mb-4">
              Explore mais conteúdo na SocializeNow
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={() => router.push('/feed')}>
                Ver Feed
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push(`/profile/${post.author._id}`)}
              >
                Ver Perfil de {post.author.name}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}