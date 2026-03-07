"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  Lock, 
  Users, 
  FileText,
  Settings,
  Eye,
  MoreHorizontal,
  Search as SearchIcon,
  TrendingUp
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Page {
  _id: string
  name: string
  description: string
  category: string
  isPublic: boolean
  customUrl?: string
  avatar?: string
  coverImage?: string
  ownerId: string
  followersCount: number
  postsCount: number
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  "Tecnologia",
  "Negócios",
  "Educação",
  "Entretenimento",
  "Esportes",
  "Saúde",
  "Arte",
  "Música",
  "Culinária",
  "Viagem",
  "Moda",
  "Outros"
]

export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    isPublic: true,
    customUrl: "",
    avatar: "",
    coverImage: ""
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchPages()
  }, [router])

  const fetchPages = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/pages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPages(data.pages)
      } else {
        setError("Erro ao carregar páginas")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Página criada com sucesso!")
        setShowCreateDialog(false)
        setFormData({
          name: "",
          description: "",
          category: "",
          isPublic: true,
          customUrl: "",
          avatar: "",
          coverImage: ""
        })
        fetchPages()
      } else {
        setError(data.error || "Erro ao criar página")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditPage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPage) return

    setSubmitting(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/pages/${selectedPage._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Página atualizada com sucesso!")
        setShowEditDialog(false)
        setSelectedPage(null)
        fetchPages()
      } else {
        setError(data.error || "Erro ao atualizar página")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePage = async () => {
    if (!selectedPage) return

    setSubmitting(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/pages/${selectedPage._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Página deletada com sucesso!")
        setShowDeleteDialog(false)
        setSelectedPage(null)
        fetchPages()
      } else {
        setError(data.error || "Erro ao deletar página")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (page: Page) => {
    setSelectedPage(page)
    setFormData({
      name: page.name,
      description: page.description,
      category: page.category,
      isPublic: page.isPublic,
      customUrl: page.customUrl || "",
      avatar: page.avatar || "",
      coverImage: page.coverImage || ""
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (page: Page) => {
    setSelectedPage(page)
    setShowDeleteDialog(true)
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Minhas Páginas</h1>
            <p className="text-muted-foreground mt-2">Gerencie suas páginas e comunidades</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Página
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Página</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePage} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da Página *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome da sua página"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva sua página..."
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customUrl">URL Personalizada</Label>
                  <Input
                    id="customUrl"
                    value={formData.customUrl}
                    onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
                    placeholder="minha-pagina-legal"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Sua página ficará em: socializenow.com/page/{formData.customUrl || "url-personalizada"}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                  />
                  <Label>Página pública</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.isPublic ? "Qualquer pessoa pode ver" : "Apenas seguidores podem ver"}
                  </p>
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Página
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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

        <Tabs defaultValue="my-pages" className="mb-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="my-pages">Minhas Páginas</TabsTrigger>
            <TabsTrigger value="discover">Descobrir</TabsTrigger>
          </TabsList>

          <TabsContent value="my-pages">
            {pages.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma página ainda</h3>
                  <p className="text-muted-foreground mb-6">
                    Crie sua primeira página para começar a construir sua comunidade
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeira Página
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map((page) => (
                  <Card key={page._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={page.avatar} />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {page.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              {page.name}
                              {page.isVerified && <Badge variant="secondary">✓</Badge>}
                            </h3>
                            <p className="text-sm text-muted-foreground">{page.category}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/page/${page._id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Página
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(page)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(page)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-foreground text-sm mb-4 line-clamp-2">{page.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {page.followersCount} seguidores
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {page.postsCount} posts
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {page.isPublic ? (
                            <Badge variant="secondary" className="gap-1">
                              <Globe className="h-3 w-3" />
                              Pública
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Privada
                            </Badge>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/page/${page._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar páginas..." className="pl-10" />
                </div>
              </div>

              <div className="grid gap-4">
                <Card className="border-dashed">
                  <CardContent className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Páginas Populares</h3>
                    <p className="text-muted-foreground text-sm">
                      Em breve você poderá descobrir páginas incríveis de outros criadores!
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Página</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditPage} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editName">Nome da Página *</Label>
                  <Input
                    id="editName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editCategory">Categoria *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="editDescription">Descrição *</Label>
                <Textarea
                  id="editDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="editCustomUrl">URL Personalizada</Label>
                <Input
                  id="editCustomUrl"
                  value={formData.customUrl}
                  onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
                <Label>Página pública</Label>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Deletar Página</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Tem certeza de que deseja deletar a página "{selectedPage?.name}"? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeletePage} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Deletar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}