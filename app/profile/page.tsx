"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { PostCard } from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Edit, MessageSquare, Settings, Shield, Camera, Menu, LogOut, Palette, Award } from "lucide-react"
import { VerifiedBadge } from "@/components/verified-badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface UserProfile {
  _id: string
  name: string
  username: string
  email: string
  bio: string
  avatar: string
  followers: number
  following: number
  postsCount: number
  createdAt: string
  isVerified: boolean
  badgeType?: string
}

interface Post {
  _id: string
  content: string
  author: {
    name: string
    email: string
  }
  createdAt: string
  likes: number
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("posts")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionUsers, setMentionUsers] = useState<{ _id: string; name: string; username: string }[]>([])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionCursorPos, setMentionCursorPos] = useState(0)
  const [mentionedUserIds, setMentionedUserIds] = useState<Record<string, string>>({})
  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    bio: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchProfile()
    fetchUserPosts()
  }, [router])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setProfileForm({
          name: data.profile.name,
          username: data.profile.username || "",
          bio: data.profile.bio || "",
        })
	if (data.profile.bio) {
    resolveMentions(data.profile.bio)
  }
      } else {
        setError("Erro ao carregar perfil")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/profile/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts)
      }
    } catch (error) {
      console.error("Erro ao carregar posts do usuário")
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione apenas arquivos de imagem")
      return
    }

    // Validar tamanho (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5MB")
      return
    }

    setUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const token = localStorage.getItem("token")
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Foto de perfil atualizada com sucesso!")
        fetchProfile()
	fetchUserPosts()
      } else {
        setError(data.error || "Erro ao fazer upload da imagem")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setUploading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError("")
    setSuccess("")

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Perfil atualizado com sucesso!")
        fetchProfile()
      } else {
        setError(data.error || "Erro ao atualizar perfil")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setUpdating(false)
    }
  }

  const resolveMentions = async (bio: string) => {
  const matches = bio.match(/@(\w+)/g) || []
  const usernames = [...new Set(matches.map((m) => m.slice(1)))]
  if (usernames.length === 0) return

  const token = localStorage.getItem("token")
  const map: Record<string, string> = {}

  await Promise.all(
    usernames.map(async (username) => {
      try {
        const res = await fetch(`/api/search/users?q=${encodeURIComponent(username)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const exactMatch = (data.users || []).find((u: any) => u.username === username)
          if (exactMatch) {
            map[username] = exactMatch._id
          }
        }
      } catch {}
    })
  )

  setMentionedUserIds(map)
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

const renderMentions = (text: string) => {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const username = part.slice(1)
      const userId = mentionedUserIds[username]
      if (userId) {
        return (
          <Link key={i} href={`/profile/${userId}`} className="text-primary font-semibold hover:underline">
            {part}
          </Link>
        )
      }
      return <span key={i} className="text-primary font-semibold">{part}</span>
    }
    return part
  })
}

const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const value = e.target.value
  const cursorPos = e.target.selectionStart || 0
  setProfileForm({ ...profileForm, bio: value })
  setMentionCursorPos(cursorPos)

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

const insertBioMention = (username: string) => {
  const bio = profileForm.bio
  const textBeforeCursor = bio.slice(0, mentionCursorPos)
  const textAfterCursor = bio.slice(mentionCursorPos)
  const beforeMention = textBeforeCursor.replace(/@\w*$/, "")
  setProfileForm({ ...profileForm, bio: `${beforeMention}@${username} ${textAfterCursor}` })
  setShowMentionDropdown(false)
  setMentionQuery("")
}

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError("")
    setSuccess("")

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("As senhas não coincidem")
      setUpdating(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres")
      setUpdating(false)
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Senha alterada com sucesso!")
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        setError(data.error || "Erro ao alterar senha")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setUpdating(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    window.location.href = "/login"
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
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>Perfil não encontrado</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header do Perfil */}
        <Card className="mb-8">
          <CardContent className="pt-6 relative">
            {/* Menu Hambúrguer */}
            <div className="absolute top-4 right-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[250px]">
                  <div className="flex flex-col gap-4 pt-6">
                    <h3 className="text-lg font-semibold mb-4">Menu</h3>
                    
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      Sair
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="justify-start gap-3 text-gray-600 hover:text-gray-700"
                      onClick={() => alert("Funcionalidade em breve!")}
                    >
                      <Palette className="h-5 w-5" />
                      Mudar Tema
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="justify-start gap-3 text-blue-600 hover:text-blue-700"
                      onClick={() => router.push("/pagamento-selo")}
                    >
                      <Award className="h-5 w-5" />
                      Verificado
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="justify-start gap-3 text-gray-600 hover:text-gray-700"
                      onClick={() => router.push("/settings")}
                    >
                      <Settings className="h-5 w-5" />
                      Configurações
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-blue-600 text-white text-2xl">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                  {profile.name}
                  {profile.isVerified && <VerifiedBadge type={(profile.badgeType as any) || "verificado"} size={20} className="ml-2" />}
                </h1>
                {profile.username && <p className="text-gray-600 mb-2">@{profile.username}</p>}
                {profile.bio && <p className="text-gray-700 mb-4">{profile.bio}</p>}

                <div className="flex justify-center md:justify-start gap-6 mb-4">
                  <div className="text-center">
                    <div className="font-bold text-xl">{profile.postsCount}</div>
                    <div className="text-gray-600 text-sm">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-xl">{profile.followers}</div>
                    <div className="text-gray-600 text-sm">Seguidores</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-xl">{profile.following}</div>
                    <div className="text-gray-600 text-sm">Seguindo</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba Posts */}
          <TabsContent value="posts" className="space-y-6">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">Você ainda não fez nenhum post.</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => <PostCard key={post._id} post={post} />)
            )}
          </TabsContent>

          {/* Aba Perfil */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Editar Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="mb-6 border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Nome de Usuário</Label>
                    <Input
                      id="username"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      placeholder="@seuusername"
                    />
                  </div>

                  <div className="space-y-2">
  <Label htmlFor="bio">Biografia</Label>
  <div className="relative">
    <Textarea
      id="bio"
      value={profileForm.bio}
      onChange={handleBioChange}
      placeholder="Conte um pouco sobre você... (use @ para mencionar alguém)"
      rows={3}
    />
    {showMentionDropdown && mentionUsers.length > 0 && (
      <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
        {mentionUsers.map((u) => (
          <button
            key={u._id}
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 transition-colors"
            onClick={() => insertBioMention(u.username || u.name)}
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
</div>

                  <Button type="submit" disabled={updating}>
                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Segurança */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Alterar Senha
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="mb-6 border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={updating}>
                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Alterar Senha
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
