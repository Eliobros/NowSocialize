"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    verificationToken: "", // ✅ ADICIONADO
  })
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCodeLoading, setSendingCodeLoading] = useState(false)
  const [verifyingCodeLoading, setVerifyingCodeLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [verificationCodeSent, setVerificationCodeSent] = useState(false)
  const [isCodeVerified, setIsCodeVerified] = useState(false)

  const router = useRouter()

  const handleSendCode = async () => {
    setError("")
    setSuccessMessage("")
    if (!formData.email || !formData.name) {
      setError("Por favor, preencha seu nome e e-mail para enviar o código.")
      return
    }
    setSendingCodeLoading(true)
    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email, name: formData.name }),
      })
      const data = await response.json()
      if (response.ok) {
        setVerificationCodeSent(true)
        setSuccessMessage(data.message)
      } else {
        setError(data.error || "Erro ao enviar código de verificação.")
      }
    } catch (error) {
      setError("Erro de conexão ao enviar código. Tente novamente.")
    } finally {
      setSendingCodeLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setError("")
    setSuccessMessage("")
    if (!verificationCode) {
      setError("Por favor, digite o código de verificação.")
      return
    }
    setVerifyingCodeLoading(true)
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email, code: verificationCode }),
      })
      const data = await response.json()
      if (response.ok) {
        setIsCodeVerified(true)
        // ✅ GUARDA O TOKEN DE VERIFICAÇÃO
        setFormData({ ...formData, verificationToken: data.verificationToken })
        setSuccessMessage(data.message + " Agora você pode criar sua conta.")
      } else {
        setError(data.error || "Erro ao verificar código.")
      }
    } catch (error) {
      setError("Erro de conexão ao verificar código. Tente novamente.")
    } finally {
      setVerifyingCodeLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")

    if (!isCodeVerified) {
      setError("Por favor, verifique seu e-mail antes de criar a conta.")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem")
      return
    }
    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          verificationToken: formData.verificationToken, // ✅ ENVIA O TOKEN
        }),
      })
      const data = await response.json()
      if (response.ok) {
        localStorage.setItem("token", data.token)
        router.push("/register/interests")
      } else {
        setError(data.error || "Erro ao criar conta")
      }
    } catch (error) {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Criar Conta no <span className="text-blue-600">SocializeNow</span>
          </CardTitle>
          <CardDescription>Preencha os dados abaixo para criar sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="bg-green-100 border-green-400 text-green-700">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={verificationCodeSent}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex space-x-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={verificationCodeSent}
                />
                <Button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCodeLoading || verificationCodeSent}
                  className="shrink-0"
                >
                  {sendingCodeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {verificationCodeSent ? "Código Enviado!" : "Enviar Código"}
                </Button>
              </div>
            </div>

            {verificationCodeSent && (
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Código de Verificação</Label>
                <div className="flex space-x-2">
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="Digite o código de 6 dígitos"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    disabled={isCodeVerified}
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyingCodeLoading || isCodeVerified}
                    className="shrink-0"
                  >
                    {verifyingCodeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCodeVerified ? "Verificado!" : "Verificar"}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="ex: habibo_dev"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme sua senha"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !isCodeVerified}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
