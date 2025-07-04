"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { PostCard } from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MessageCircle, UserPlus, UserMinus } from "lucide-react"

interface UserProfile {
  _id: string
  name: string
  username: string
  email: string
  bio: string
  avatar?: string
  followers: number
  following: number
  postsCount: number
  isFollowing?: boolean
}

interface Post {
  _id: string
  content: string
  author: {
    _id: string
    name: string
    email: string
    avatar?: string
  }
  createdAt: string
  likes: number
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchUserProfile()
    fetchUserPosts()
  }, [params.userId, router])

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/profile/${params.userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setFollowing(data.profile.isFollowing || false)
      } else {
        setError("Erro ao carregar perfil")
      }
    } catch (error) {
      setError("Erro de conexão")
    }
  }

  const fetchUserPosts = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/profile/${params.userId}/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts)
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch("/api/follow", {
      method: following ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: params.userId }),
    })

    if (response.ok) {
      const data = await response.json()

      // Atualize diretamente com os dados retornados da API
      setFollowing(data.following)
      if (profile) {
        setProfile({
          ...profile,
          followers: data.followers, // <- use o valor retornado da API!
        })
      }
    } else {
      const data = await response.json()
      setError(data.error || "Erro ao seguir usuário")
    }
  } catch (error) {
    console.error("Erro ao seguir usuário:", error)
    setError("Erro ao seguir usuário")
  }
}

  const handleMessage = () => {
    router.push(`/messages?user=${params.userId}`)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Alert variant="destructive">
            <AlertDescription>Usuário não encontrado</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24">
                {profile.avatar ? <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.name} /> : null}
                <AvatarFallback className="bg-blue-600 text-white text-2xl">{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <CardTitle className="text-2xl mb-2">{profile.name}</CardTitle>
                <p className="text-gray-600 mb-2">@{profile.username}</p>
                {profile.bio && <p className="text-gray-700 mb-4">{profile.bio}</p>}
                <div className="flex justify-center sm:justify-start gap-4 mb-4">
                  <Badge variant="secondary">{profile.postsCount} Posts</Badge>
                  <Badge variant="secondary">{profile.followers} Seguidores</Badge>
                  <Badge variant="secondary">{profile.following} Seguindo</Badge>
                </div>
                <div className="flex justify-center sm:justify-start gap-2">
                  <Button onClick={handleFollow} variant={following ? "outline" : "default"}>
                    {following ? (
                      <>
                        <UserMinus className="mr-2 h-4 w-4" />
                        Deixar de seguir
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Seguir
                      </>
                    )}
                  </Button>
                  <Button onClick={handleMessage} variant="outline">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Mensagem
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Posts de {profile.name}</h2>
          {posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">Nenhum post encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => <PostCard key={post._id} post={post} />)
          )}
        </div>
      </div>
    </div>
  )
}
