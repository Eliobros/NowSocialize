"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { CheckCircle, Shield, Home, Loader2, AlertCircle } from "lucide-react"

export default function VerificaContent() {
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const salvarPagamento = async () => {
      const numero = params.get("numero")
      const nome = params.get("nome")
      const email = params.get("email")
      const valor = params.get("valor")
      const meio_de_pagamento = params.get("meio_de_pagamento")

      if (!numero || !nome || !valor) {
        setError("Dados de pagamento incompletos")
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/pagamento", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            numero,
            nome,
            email,
            valor,
            meio_de_pagamento,
            status: "sucesso",
          }),
        })

        const data = await response.json()

        if (data.success) {
          setSuccess(true)
          console.log("Pagamento salvo com sucesso!")
        } else {
          setError("Erro ao processar pagamento")
        }
      } catch (err) {
        console.error("Erro ao salvar pagamento:", err)
        setError("Erro de conexão")
      } finally {
        setLoading(false)
      }
    }

    salvarPagamento()
  }, [params])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Processando Pagamento...</h2>
              <p className="text-gray-600 text-center">Aguarde enquanto confirmamos seu pagamento</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {success ? (
          <Card className="border-green-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-green-800">Pagamento Concluído com Sucesso! 🎉</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="bg-green-50 p-6 rounded-lg">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Solicitação de Selo Enviada!</h3>
                  <p className="text-green-700">
                    Obrigado por apoiar a SocializeNow! Sua solicitação de selo de verificação foi enviada para nossa
                    equipe de análise.
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Próximos Passos:</h4>
                  <ul className="text-sm text-blue-700 space-y-1 text-left">
                    <li>• Nossa equipe analisará sua solicitação</li>
                    <li>• Você receberá uma notificação com o resultado</li>
                    <li>• O processo pode levar até 24 horas</li>
                    <li>• Verifique suas notificações regularmente</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => router.push("/notifications")} variant="outline" className="flex-1">
                  Ver Notificações
                </Button>
                <Button onClick={() => router.push("/")} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Home className="h-4 w-4 mr-2" />
                  Ir para o Feed
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-red-800">Erro no Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-red-700 mb-4">{error}</p>
                <p className="text-gray-600">
                  Houve um problema ao processar seu pagamento. Tente novamente ou entre em contato com o suporte.
                </p>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => router.push("/settings")} variant="outline" className="flex-1">
                  Tentar Novamente
                </Button>
                <Button onClick={() => router.push("/")} className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Voltar ao Feed
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}