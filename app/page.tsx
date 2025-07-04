import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageCircle, Heart } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Socialize<span className="text-blue-600">Now</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Conecte-se com pessoas incríveis, compartilhe momentos especiais e descubra um mundo de possibilidades
            sociais.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="px-8 py-3 text-lg">
                Criar Conta
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                Fazer Login
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Conecte-se</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Encontre e conecte-se com amigos, familiares e pessoas com interesses similares.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Compartilhe</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Compartilhe seus momentos, pensamentos e experiências com sua rede social.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Heart className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <CardTitle>Interaja</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Curta, comente e compartilhe conteúdos que ressoam com você.</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
