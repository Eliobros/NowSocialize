"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Search, UserPlus, UserCheck, MessageCircle } from "lucide-react"

interface User {
  _id: string
  name: string
  username: string
  email: string
  bio: string
  avatar: string
  followers: number
  following: number
  isFollowing: boolean
}

export default function SearchPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    // Buscar usuários populares inicialmente
    searchUsers("")
  }, [router])

  const searchUsers = async (query: string) => {
    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        setError("Erro ao buscar usuários")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchUsers(searchTerm)
  }

  const handleFollow = async (userId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setFollowingUsers((prev) => new Set(prev).add(userId))
        setUsers((prev) =>
          prev.map((user) =>
            user._id === userId ? { ...user, isFollowing: true, followers: user.followers + 1 } : user,
          ),
        )
      }
    } catch (error) {
      console.error("Erro ao seguir usuário")
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/follow", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setFollowingUsers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
        setUsers((prev) =>
          prev.map((user) =>
            user._id === userId ? { ...user, isFollowing: false, followers: user.followers - 1 } : user,
          ),
        )
      }
    } catch (error) {
      console.error("Erro ao deixar de seguir usuário")
    }
  }

  const startConversation = async (userId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/messages?conversation=${data.conversationId}`)
      }
    } catch (error) {
      console.error("Erro ao iniciar conversa")
    }
  }

  const getInitials = (name?: string) => {
  if (!name) return "??"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6" />
              Pesquisar Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Buscar por nome ou username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users.length === 0 && !loading ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? "Nenhum usuário encontrado" : "Digite algo para pesquisar usuários"}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            users.map((user) => (
              <Card key={user._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 mb-4">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-blue-600 text-white text-lg">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="font-semibold text-lg mb-1">{user.name}</h3>
                    {user.username && <p className="text-gray-600 text-sm mb-2">@{user.username}</p>}
                    {user.bio && <p className="text-gray-700 text-sm mb-4 line-clamp-2">{user.bio}</p>}

                    <div className="flex gap-4 mb-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold">{user.followers}</div>
                        <div className="text-gray-600">Seguidores</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{user.following}</div>
                        <div className="text-gray-600">Seguindo</div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full">
                      {user.isFollowing ? (
                        <Button variant="outline" size="sm" onClick={() => handleUnfollow(user._id)} className="flex-1">
                          <UserCheck className="h-4 w-4 mr-2" />
                          Seguindo
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleFollow(user._id)} className="flex-1">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Seguir
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => startConversation(user._id)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
