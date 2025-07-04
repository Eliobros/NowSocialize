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
import { CheckCircle, Shield, HelpCircle, Loader2, Upload } from "lucide-react"

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

  const [verifyForm, setVerifyForm] = useState({
    fullName: "",
    birthDate: "",
    reason: "",
    documentFront: null as File | null,
    documentBack: null as File | null,
  })

  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
  })

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
        setVerifyForm((prev) => ({
          ...prev,
          fullName: data.profile.name,
        }))
      }
    } catch (error) {
      setError("Erro ao carregar dados do usuário")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyForm.documentFront || !verifyForm.documentBack) {
      setError("Por favor, envie ambos os lados do documento")
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
        // Redirecionar para pagamento em vez de mostrar sucesso
        router.push("/pagamento-selo")
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Configurações</h1>

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

        <Tabs defaultValue="verification" className="space-y-6">
          <TabsList>
            <TabsTrigger value="verification" className="gap-2">
              <Shield className="h-4 w-4" />
              Verificação
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Suporte
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
                    <div className="bg-blue-50 p-6 rounded-lg">
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
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Solicitação de Selo de Verificação</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleVerifySubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
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

                          <div className="grid grid-cols-2 gap-4">
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
                            Prosseguir para Pagamento
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
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
                <div className="bg-gray-50 p-6 rounded-lg">
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
        </Tabs>
      </div>
    </div>
  )
}
