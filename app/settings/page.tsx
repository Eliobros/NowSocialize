"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, Shield, HelpCircle, Loader2, Upload, Trash2, UserX, AlertTriangle, Ban, Languages } from "lucide-react"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showVerifyDialog, setShowVerifyDialog] = useState(false)
  const [showSupportDialog, setShowSupportDialog] = useState(false)
  const router = useRouter()

  const frontDocRef = useRef<HTMLInputElement>(null)
  const backDocRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  const [verifyForm, setVerifyForm] = useState({
    fullName: "",
    birthDate: "",
    reason: "",
    documentType: "",
    documentFront: null as File | null,
    documentBack: null as File | null,
    selfie: null as File | null,
  })

  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
  })

  // Estados para gerenciamento de conta
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [accountStatus, setAccountStatus] = useState({
    isDeactivated: false,
    markedForDeletion: false,
    deletionDate: null as string | null,
    daysRemaining: 0
  })
  const [preferredLanguage, setPreferredLanguage] = useState("")
  const [savingLanguage, setSavingLanguage] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchUserData()
  }, [router])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.profile)
        setPreferredLanguage(data.profile.preferredLanguage || "")
        setVerifyForm((prev) => ({
          ...prev,
          fullName: data.profile.name,
        }))
        
        // Atualizar status da conta
        setAccountStatus({
          isDeactivated: data.profile.isDeactivated || false,
          markedForDeletion: data.profile.markedForDeletion || false,
          deletionDate: data.profile.deletionScheduledAt || null,
          daysRemaining: data.profile.deletionScheduledAt 
            ? Math.ceil((new Date(data.profile.deletionScheduledAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : 0
        })
      }
    } catch (error) {
      setError("Erro ao carregar dados do usuário")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyForm.documentFront || !verifyForm.documentBack || !verifyForm.selfie || !verifyForm.documentType) {
      setError("Por favor, preencha todos os campos e envie todos os documentos")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("fullName", verifyForm.fullName)
      formData.append("birthDate", verifyForm.birthDate)
      formData.append("reason", verifyForm.reason)
      formData.append("documentFront", verifyForm.documentFront)
      formData.append("documentBack", verifyForm.documentBack)
      formData.append("documentType", verifyForm.documentType)
      formData.append("selfie", verifyForm.selfie)

      const token = localStorage.getItem("token")
      const response = await fetch("/api/profile/verify-request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Solicitação enviada com sucesso! Nossa equipe analisará seus dados.")
        setShowVerifyDialog(false)
        setVerifyForm({ fullName: user?.name || "", birthDate: "", reason: "", documentType: "", documentFront: null, documentBack: null, selfie: null })
      } else {
        setError(data.error || "Erro ao enviar solicitação")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(supportForm),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Ticket de suporte criado com sucesso!")
        setShowSupportDialog(false)
        setSupportForm({
          subject: "",
          message: "",
        })
      } else {
        setError(data.error || "Erro ao criar ticket")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setSubmitting(true)
    setError("")
    
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Conta marcada para exclusão em 60 dias. Você pode cancelar a qualquer momento.")
        setShowDeleteDialog(false)
        fetchUserData() // Atualizar dados
      } else {
        setError(data.error || "Erro ao marcar conta para exclusão")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelDeletion = async () => {
    setSubmitting(true)
    setError("")
    
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Exclusão de conta cancelada com sucesso!")
        fetchUserData() // Atualizar dados
      } else {
        setError(data.error || "Erro ao cancelar exclusão")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivateAccount = async (action: "deactivate" | "reactivate") => {
    setSubmitting(true)
    setError("")
    
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/account/delete", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(action === "deactivate" ? "Conta desativada com sucesso!" : "Conta reativada com sucesso!")
        setShowDeactivateDialog(false)
        fetchUserData() // Atualizar dados
      } else {
        setError(data.error || `Erro ao ${action === "deactivate" ? "desativar" : "reativar"} conta`)
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveLanguage = async () => {
    setSavingLanguage(true)
    setError("")
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name,
          username: user.username,
          bio: user.bio,
          avatar: user.avatar,
          preferredLanguage
        }),
      })
      if (response.ok) {
        setSuccess("Idioma preferido salvo com sucesso!")
      } else {
        const data = await response.json()
        setError(data.error || "Erro ao salvar idioma")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setSavingLanguage(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8">Configurações</h1>

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

        <Tabs defaultValue="verification" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="verification" className="gap-1.5 text-xs sm:text-sm flex-1 min-w-0">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Verificação</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="gap-1.5 text-xs sm:text-sm flex-1 min-w-0">
              <Languages className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Idioma</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1.5 text-xs sm:text-sm flex-1 min-w-0">
              <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Suporte</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm flex-1 min-w-0">
              <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Conta</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Selo de Verificação
                  {user?.isVerified && <CheckCircle className="h-5 w-5 text-blue-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {user?.isVerified ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Perfil Verificado!</h3>
                    <p className="text-gray-600">Seu perfil já possui o selo de verificação do SocializeNow.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 sm:p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">🌟 Mostre que seu perfil é verificado!</h3>
                      <p className="text-gray-700 mb-4">
                        Obtenha o selo de verificação oficial do SocializeNow e mostre para todos que seu perfil é
                        autêntico e confiável.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1 mb-4">
                        <li>• Maior credibilidade na plataforma</li>
                        <li>• Destaque visual no seu perfil</li>
                        <li>• Proteção contra perfis falsos</li>
                      </ul>
                    </div>

                    <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          <Shield className="h-4 w-4 mr-2" />
                          Solicitar Selo de Verificação
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Solicitação de Selo de Verificação</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleVerifySubmit} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="fullName">Nome Completo</Label>
                              <Input
                                id="fullName"
                                value={verifyForm.fullName}
                                onChange={(e) => setVerifyForm({ ...verifyForm, fullName: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="birthDate">Data de Nascimento</Label>
                              <Input
                                id="birthDate"
                                type="date"
                                value={verifyForm.birthDate}
                                onChange={(e) => setVerifyForm({ ...verifyForm, birthDate: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="documentType">Tipo de Documento</Label>
                            <select
                              id="documentType"
                              value={verifyForm.documentType}
                              onChange={(e) => setVerifyForm({ ...verifyForm, documentType: e.target.value })}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              required
                            >
                              <option value="">Selecione o tipo de documento</option>
                              <option value="bi">Bilhete de Identidade (BI)</option>
                              <option value="passport">Passaporte</option>
                              <option value="rg">RG</option>
                              <option value="cnh">Carta de Condução (CNH)</option>
                              <option value="dire">DIRE (Documento de Identificação de Residente Estrangeiro)</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Documento (Frente)</Label>
                              <div className="mt-2">
                                <input
                                  ref={frontDocRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    setVerifyForm({ ...verifyForm, documentFront: e.target.files?.[0] || null })
                                  }
                                  className="hidden"
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => frontDocRef.current?.click()}
                                  className="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  {verifyForm.documentFront ? verifyForm.documentFront.name : "Escolher arquivo"}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label>Documento (Verso)</Label>
                              <div className="mt-2">
                                <input
                                  ref={backDocRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    setVerifyForm({ ...verifyForm, documentBack: e.target.files?.[0] || null })
                                  }
                                  className="hidden"
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => backDocRef.current?.click()}
                                  className="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  {verifyForm.documentBack ? verifyForm.documentBack.name : "Escolher arquivo"}
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label>Foto Pessoal (Selfie)</Label>
                            <p className="text-xs text-muted-foreground mb-2">Tire uma foto do seu rosto segurando o documento</p>
                            <div className="mt-1">
                              <input
                                ref={selfieRef}
                                type="file"
                                accept="image/*"
                                capture="user"
                                onChange={(e) =>
                                  setVerifyForm({ ...verifyForm, selfie: e.target.files?.[0] || null })
                                }
                                className="hidden"
                                required
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => selfieRef.current?.click()}
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {verifyForm.selfie ? verifyForm.selfie.name : "Tirar foto / Escolher"}
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="reason">Por que você quer obter o selo de verificação?</Label>
                            <Textarea
                              id="reason"
                              value={verifyForm.reason}
                              onChange={(e) => setVerifyForm({ ...verifyForm, reason: e.target.value })}
                              placeholder="Explique por que você merece o selo de verificação..."
                              rows={4}
                              required
                            />
                          </div>

                          <Button type="submit" disabled={submitting} className="w-full">
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Enviar Solicitação
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="language">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Tradução Automática
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 p-4 sm:p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">🌍 Tradução em Tempo Real</h3>
                    <p className="text-gray-700 mb-4">
                      Receba mensagens traduzidas automaticamente no seu idioma preferido.
                      As mensagens de outros idiomas serão traduzidas em tempo real!
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 mb-4">
                      <li>• Tradução automática de mensagens recebidas</li>
                      <li>• Botão para ver o idioma original</li>
                      <li>• Também pode alterar no ícone 🌐 dentro do chat</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="preferredLanguage">Idioma Preferido</Label>
                      <select
                        id="preferredLanguage"
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Selecione um idioma</option>
                        <option value="pt">Português</option>
                        <option value="en">Inglês</option>
                        <option value="es">Espanhol</option>
                        <option value="fr">Francês</option>
                        <option value="de">Alemão</option>
                        <option value="it">Italiano</option>
                        <option value="ja">Japonês</option>
                        <option value="ko">Coreano</option>
                        <option value="zh">Chinês</option>
                        <option value="ar">Árabe</option>
                        <option value="ru">Russo</option>
                        <option value="hi">Hindi</option>
                        <option value="tr">Turco</option>
                        <option value="nl">Holandês</option>
                        <option value="pl">Polonês</option>
                        <option value="sv">Sueco</option>
                      </select>
                    </div>

                    <Button onClick={handleSaveLanguage} disabled={savingLanguage} className="w-full">
                      {savingLanguage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar Idioma Preferido
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Suporte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Precisa de ajuda?</h3>
                  <p className="text-gray-700 mb-4">
                    Nossa equipe está aqui para ajudar! Abra um ticket de suporte e entraremos em contato o mais breve
                    possível.
                  </p>
                </div>

                <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Abrir Ticket de Suporte
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Ticket de Suporte</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSupportSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="subject">Assunto</Label>
                        <Input
                          id="subject"
                          value={supportForm.subject}
                          onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                          placeholder="Descreva brevemente o problema"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="message">Mensagem</Label>
                        <Textarea
                          id="message"
                          value={supportForm.message}
                          onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                          placeholder="Descreva detalhadamente o problema ou dúvida..."
                          rows={6}
                          required
                        />
                      </div>

                      <Button type="submit" disabled={submitting} className="w-full">
                        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Enviar Ticket
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Gerenciar Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status da conta */}
                {accountStatus.markedForDeletion && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Conta marcada para exclusão!</strong><br />
                      Sua conta será permanentemente deletada em {accountStatus.daysRemaining} dias 
                      ({new Date(accountStatus.deletionDate!).toLocaleDateString('pt-BR')}).
                      <br />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancelDeletion}
                        disabled={submitting}
                        className="mt-2"
                      >
                        {submitting ? "Cancelando..." : "Cancelar Exclusão"}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {accountStatus.isDeactivated && (
                  <Alert>
                    <UserX className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Conta desativada</strong><br />
                      Sua conta está temporariamente desativada. Ninguém pode ver seu conteúdo.
                      <br />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeactivateAccount("reactivate")}
                        disabled={submitting}
                        className="mt-2"
                      >
                        {submitting ? "Reativando..." : "Reativar Conta"}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Desativar conta */}
                <div className="bg-yellow-50 p-4 sm:p-6 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <UserX className="h-5 w-5 text-yellow-600" />
                    Desativar Conta
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Desative temporariamente sua conta. Ninguém poderá ver seu perfil ou conteúdo, 
                    mas você pode reativar a qualquer momento.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• Seu perfil ficará invisível</li>
                    <li>• Posts e comentários ficam ocultos</li>
                    <li>• Você pode reativar a qualquer momento</li>
                    <li>• Seus dados não são perdidos</li>
                  </ul>
                  {!accountStatus.isDeactivated && (
                    <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-yellow-600 border-yellow-300 hover:bg-yellow-50">
                          <UserX className="h-4 w-4 mr-2" />
                          Desativar Conta
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Desativar Conta</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-gray-600">
                            Tem certeza de que deseja desativar sua conta? Você pode reativar a qualquer momento.
                          </p>
                          <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={() => handleDeactivateAccount("deactivate")}
                              disabled={submitting}
                            >
                              {submitting ? "Desativando..." : "Desativar"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Excluir conta */}
                <div className="bg-red-50 p-4 sm:p-6 rounded-lg border border-red-200">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    Excluir Conta Permanentemente
                  </h3>
                  <p className="text-gray-700 mb-4">
                    <strong>⚠️ ATENÇÃO:</strong> Esta ação marca sua conta para exclusão permanente em 60 dias. 
                    Todos os seus dados serão deletados definitivamente.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• Período de reflexão de 60 dias</li>
                    <li>• Todos os posts, mensagens e dados serão perdidos</li>
                    <li>• Você pode cancelar durante os 60 dias</li>
                    <li>• Após 60 dias, a exclusão é irreversível</li>
                  </ul>
                  {!accountStatus.markedForDeletion && (
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Conta
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-red-600">⚠️ Excluir Conta Permanentemente</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-red-50 p-4 rounded border border-red-200">
                            <p className="text-red-800 font-medium mb-2">Esta ação não pode ser desfeita!</p>
                            <p className="text-red-700 text-sm">
                              Sua conta será marcada para exclusão e deletada permanentemente em 60 dias. 
                              Todos os seus dados (posts, mensagens, fotos) serão perdidos para sempre.
                            </p>
                          </div>
                          <p className="text-gray-600">
                            Você tem certeza de que deseja continuar? Você pode cancelar durante os próximos 60 dias.
                          </p>
                          <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={handleDeleteAccount}
                              disabled={submitting}
                            >
                              {submitting ? "Processando..." : "Sim, Excluir Minha Conta"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
