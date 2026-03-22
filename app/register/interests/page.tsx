"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles } from "lucide-react"

const AVAILABLE_INTERESTS = [
  { label: "Tecnologia", emoji: "💻" },
  { label: "Música", emoji: "🎵" },
  { label: "Esportes", emoji: "⚽" },
  { label: "Filmes & Séries", emoji: "🎬" },
  { label: "Games", emoji: "🎮" },
  { label: "Culinária", emoji: "🍳" },
  { label: "Viagens", emoji: "✈️" },
  { label: "Fotografia", emoji: "📸" },
  { label: "Moda", emoji: "👗" },
  { label: "Arte & Design", emoji: "🎨" },
  { label: "Ciência", emoji: "🔬" },
  { label: "Educação", emoji: "📚" },
  { label: "Negócios", emoji: "💼" },
  { label: "Saúde & Fitness", emoji: "💪" },
  { label: "Livros", emoji: "📖" },
  { label: "Humor", emoji: "😂" },
  { label: "Política", emoji: "🏛️" },
  { label: "Natureza", emoji: "🌿" },
  { label: "Programação", emoji: "👨‍💻" },
  { label: "Empreendedorismo", emoji: "🚀" },
]

export default function InterestsPage() {
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
    }
  }, [router])

  const toggleInterest = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
          ? [...prev, interest]
          : prev
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      await fetch("/api/auth/interests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interests: selected }),
      })
      router.push("/feed")
    } catch {
      router.push("/feed")
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push("/feed")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">
            Quais são seus interesses?
          </CardTitle>
          <CardDescription>
            Selecione até 5 interesses para a Tina personalizar sua experiência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {AVAILABLE_INTERESTS.map((interest) => {
              const isSelected = selected.includes(interest.label)
              return (
                <Badge
                  key={interest.label}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer text-sm py-2 px-3 transition-all ${
                    isSelected
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "hover:bg-blue-50 hover:border-blue-300"
                  } ${
                    !isSelected && selected.length >= 5
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={() => toggleInterest(interest.label)}
                >
                  {interest.emoji} {interest.label}
                </Badge>
              )
            })}
          </div>

          <p className="text-sm text-muted-foreground text-center mb-4">
            {selected.length}/5 selecionados
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
            >
              Pular
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || selected.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
