"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, Shield, MessageSquare, Loader2 } from "lucide-react"

interface VerifyRequest {
  _id: string
  userId: string
  fullName: string
  birthDate: string
  documentType: string
  documentFront: string
  documentBack: string
  selfie: string
  reason: string
  status: "pending" | "approved" | "rejected"
  rejectReason?: string
  createdAt: string
  user: {
    name: string
    email: string
    avatar: string
  }
}

interface SupportTicket {
  _id: string
  userId: string
  name: string
  username: string
  email: string
  subject: string
  message: string
  status: "open" | "closed"
  createdAt: string
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [verifyRequests, setVerifyRequests] = useState<VerifyRequest[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})
  const [badgeTypes, setBadgeTypes] = useState<Record<string, string>>({})
  const [manualBadgeUserId, setManualBadgeUserId] = useState("")
  const [manualBadgeType, setManualBadgeType] = useState("verificado")
  const [badgeSuccess, setBadgeSuccess] = useState("")

  const handleLogin = () => {
    if (password === "Cadeira33@") {
      setIsAuthenticated(true)
      fetchData()
    } else {
      setError("Senha incorreta")
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Buscar solicitações de verificação
      const verifyResponse = await fetch("/api/admin/verify-requests")
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json()
        setVerifyRequests(verifyData.requests)
      }

      // Buscar tickets de suporte
      const supportResponse = await fetch("/api/admin/support-tickets")
      if (supportResponse.ok) {
        const supportData = await supportResponse.json()
        setSupportTickets(supportData.tickets)
      }
    } catch (error) {
      setError("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyRequest = async (requestId: string, action: "approve" | "reject") => {
    try {
      const response = await fetch(`/api/admin/verify-requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, reason: rejectReasons[requestId] || "", badgeType: badgeTypes[requestId] || "verificado" }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      setError("Erro ao processar solicitação")
    }
  }

  const handleSetManualBadge = async () => {
    try {
      const response = await fetch("/api/admin/set-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, userId: manualBadgeUserId, badgeType: manualBadgeType }),
      })
      const data = await response.json()
      if (response.ok) {
        setBadgeSuccess(data.message)
        setManualBadgeUserId("")
        setTimeout(() => setBadgeSuccess(""), 3000)
      } else {
        setError(data.error)
      }
    } catch {
      setError("Erro ao atribuir selo")
    }
  }

  const handleSupportTicket = async (ticketId: string, action: "close") => {
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        fetchData() // Recarregar dados
      }
    } catch (error) {
      setError("Erro ao processar ticket")
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Painel de Administração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Input
              type="password"
              placeholder="Digite a senha de administrador"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Painel de Administração</h1>
          <Button variant="outline" onClick={() => router.push("/feed")}>
            Voltar ao Feed
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="verify" className="space-y-6">
          <TabsList>
            <TabsTrigger value="verify" className="gap-2">
              <Shield className="h-4 w-4" />
              Solicitações de Verificação ({verifyRequests.filter((r) => r.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Tickets de Suporte ({supportTickets.filter((t) => t.status === "open").length})
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-2">
              <Shield className="h-4 w-4" />
              Gerenciar Selos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verify">
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : verifyRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">Nenhuma solicitação de verificação encontrada</p>
                  </CardContent>
                </Card>
              ) : (
                verifyRequests.map((request) => (
                  <Card key={request._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={request.user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{request.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{request.user.name}</h3>
                            <p className="text-sm text-gray-600">{request.user.email}</p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            request.status === "pending"
                              ? "default"
                              : request.status === "approved"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {request.status === "pending"
                            ? "Pendente"
                            : request.status === "approved"
                              ? "Aprovado"
                              : "Rejeitado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Nome Completo:</label>
                          <p>{request.fullName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Data de Nascimento:</label>
                          <p>{new Date(request.birthDate).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Tipo de Documento:</label>
                        <p>{request.documentType === 'bi' ? 'Bilhete de Identidade' : request.documentType === 'passport' ? 'Passaporte' : request.documentType === 'rg' ? 'RG' : request.documentType === 'cnh' ? 'CNH' : request.documentType === 'dire' ? 'DIRE' : request.documentType || 'Não informado'}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Motivo:</label>
                        <p className="mt-1">{request.reason}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Documento (Frente):</label>
                          <img
                            src={request.documentFront || "/placeholder.svg"}
                            alt="Documento frente"
                            className="mt-2 w-full h-32 object-cover rounded border"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Documento (Verso):</label>
                          <img
                            src={request.documentBack || "/placeholder.svg"}
                            alt="Documento verso"
                            className="mt-2 w-full h-32 object-cover rounded border"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Foto Pessoal (Selfie):</label>
                        {request.selfie && (
                          <img
                            src={request.selfie}
                            alt="Selfie"
                            className="mt-2 w-full max-w-xs h-48 object-cover rounded border"
                          />
                        )}
                      </div>

                      {request.status === "pending" && (
                        <div className="space-y-3 pt-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Tipo de Selo</label>
                            <select
                              value={badgeTypes[request._id] || "verificado"}
                              onChange={(e) => setBadgeTypes(prev => ({ ...prev, [request._id]: e.target.value }))}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="verificado">✅ Verificado (Azul Claro)</option>
                              <option value="dev">💻 Desenvolvedor (Verde)</option>
                              <option value="dev_sn">🟣 Dev SocializeNow (Roxo)</option>
                              <option value="empresa">🏢 Empresa Oficial (Azul)</option>
                              <option value="dono">👑 Dono (Dourado)</option>
                            </select>
                          </div>
                          <Textarea
                            placeholder="Motivo da recusa (obrigatório para rejeitar)..."
                            value={rejectReasons[request._id] || ""}
                            onChange={(e) => setRejectReasons(prev => ({ ...prev, [request._id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => handleVerifyRequest(request._id, "approve")} className="flex-1">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aprovar
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (!rejectReasons[request._id]?.trim()) {
                                  alert("Escreva o motivo da recusa antes de rejeitar")
                                  return
                                }
                                handleVerifyRequest(request._id, "reject")
                              }}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      )}
                      {request.status === "rejected" && request.rejectReason && (
                        <div className="mt-2 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm font-medium text-red-800">Motivo da recusa:</p>
                          <p className="text-sm text-red-700">{request.rejectReason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="support">
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : supportTickets.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">Nenhum ticket de suporte encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                supportTickets.map((ticket) => (
                  <Card key={ticket._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{ticket.name}</h3>
                          <p className="text-sm text-gray-600">
                            @{ticket.username} • {ticket.email}
                          </p>
                        </div>
                        <Badge variant={ticket.status === "open" ? "default" : "secondary"}>
                          {ticket.status === "open" ? "Aberto" : "Fechado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Assunto:</label>
                        <p>{ticket.subject}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Mensagem:</label>
                        <p className="mt-1 whitespace-pre-wrap">{ticket.message}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Data:</label>
                        <p>{new Date(ticket.createdAt).toLocaleString("pt-BR")}</p>
                      </div>

                      {ticket.status === "open" && (
                        <Button onClick={() => handleSupportTicket(ticket._id, "close")} variant="outline">
                          Fechar Ticket
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle>Atribuir Selo Manualmente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">ID do Usuário</label>
                  <Input
                    placeholder="Cole o ID do usuário aqui"
                    value={manualBadgeUserId}
                    onChange={(e) => setManualBadgeUserId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Selo</label>
                  <select
                    value={manualBadgeType}
                    onChange={(e) => setManualBadgeType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="verificado">✅ Verificado (Azul Claro)</option>
                    <option value="dev">💻 Desenvolvedor (Verde)</option>
                    <option value="dev_sn">🟣 Dev SocializeNow (Roxo)</option>
                    <option value="empresa">🏢 Empresa Oficial (Azul)</option>
                    <option value="dono">👑 Dono (Dourado)</option>
                  </select>
                </div>
                <Button onClick={handleSetManualBadge} disabled={!manualBadgeUserId}>
                  <Shield className="h-4 w-4 mr-2" />
                  Atribuir Selo
                </Button>
                {badgeSuccess && (
                  <Alert>
                    <AlertDescription>{badgeSuccess}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
