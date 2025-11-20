"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { PostCard } from "@/components/post-card"
import { Card, CardContent } from "@/components/ui/card"
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

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.postId as string
  
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string>("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    // Decodificar token para pegar o userId
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setCurrentUserId(payload.userId || payload.id || payload._id)
    } catch (e) {
      console.error("Erro ao decodificar token:", e)
    }

    fetchPost()
  }, [postId, router])

  const fetchPost = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPost(data.post)
      } else if (response.status === 404) {
        setError("Post não encontrado")
      } else {
        setError("Erro ao carregar post")
      }
    } catch (error) {
      console.error("Erro ao buscar post:", error)
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const handlePostDeleted = (deletedPostId: string) => {
    // Redirecionar para o feed após deletar o post
    router.push("/feed")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-red-500 mb-4">{error || "Post não encontrado"}</p>
              <Button onClick={() => router.push("/feed")}>
                Voltar ao Feed
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <PostCard 
          post={post} 
          currentUserId={currentUserId}
          onPostDeleted={handlePostDeleted}
        />
      </div>
    </div>
  )
}
