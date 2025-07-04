"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Navbar } from "@/components/navbar"
import { Shield, CreditCard, Smartphone, Loader2, CheckCircle } from "lucide-react"

export default function PagamentoSelo() {
  const [numero, setNumero] = useState("")
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [metodoPagamento, setMetodoPagamento] = useState("Mpesa")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

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
        setNome(data.profile.name)
        setEmail(data.profile.email || "")
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário")
    }
  }

const pagar = async () => {
  if (!numero || !nome) {
    alert("Preencha todos os campos obrigatórios")
    return
  }

  setLoading(true)

  try {
    const response = await fetch("https://mozpayment.co.mz/api/1.1/wf/white-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        carteira: process.env.NEXT_PUBLIC_CARTEIRA_ID,
        numero,
        nome,
        valor: "10",
        meio_de_pagamento: metodoPagamento,
        email,
        return_url: `${window.location.origin}/verifica`,
      }),
    })

    const url = await response.text()
    console.log("URL do pagamento:", url)

    if (!url) {
      alert("Erro: URL de checkout não recebida.")
      setLoading(false)
      return
    }

    window.location.href = url
  } catch (err) {
    console.error(err)
    alert("Erro ao iniciar pagamento.")
  } finally {
    setLoading(false)
  }
}


  if (!user) {
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Selo de Verificação</h1>
          </div>
          <p className="text-gray-600">Complete o pagamento para obter seu selo de verificação oficial</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resumo da Solicitação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Solicitante:</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium">Selo de Verificação</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valor:</span>
              <span className="font-bold text-lg text-blue-600">10 MT</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Dados de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metodoPagamento">Método de Pagamento</Label>
                <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mpesa">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Mpesa
                      </div>
                    </SelectItem>
                    <SelectItem value="Emola">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Emola
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número {metodoPagamento}</Label>
                <Input
                  id="numero"
                  type="tel"
                  placeholder={`Ex: ${metodoPagamento === "Mpesa" ? "84/85" : "86/87"}XXXXXXX`}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Importante:</strong> Após o pagamento, sua solicitação será analisada pela nossa equipe. Você
                receberá uma notificação com o resultado em até 24 horas.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.back()} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={pagar}
                disabled={loading || !numero || !nome}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar 10 MT
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Pagamento seguro processado via MozPayment</p>
        </div>
      </div>
    </div>
  )
}
