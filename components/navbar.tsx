"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Bell, MessageSquare, User, Video, Menu, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

interface UserData {
  name: string
  email: string
  username: string
  avatar?: string
}

export function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return

        const response = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data: UserData = await response.json()
          setUser(data)
        } else {
          console.error("Failed to fetch user data:", response.statusText)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoadingUser(false)
      }
    }
    fetchUserData()
  }, [])

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
    toast({
      title: "Desconectado",
      description: "Você foi desconectado com sucesso.",
    })
  }

  const navItems = [
    { href: "/feed", icon: Home, label: "Início" },
    { href: "/notifications", icon: Bell, label: "Notificações" },
    { href: "/reels", icon: Video, label: "Reels" },
    { href: "/pages", icon: FileText, label: "Páginas" },
    { href: "/search", icon: Search, label: "Buscar" },
    { href: "/profile", icon: User, label: "Perfil" },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto h-16 flex items-center justify-between px-4 md:px-6">
          <Link href="/feed" className="flex items-center gap-3 font-bold text-xl">
            <img src="/soocializenow.png" alt="SocializeNow Logo" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-blue-600">SocializeNow</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-600 ${
                  pathname === item.href ? "text-blue-600" : "text-gray-600"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Actions / Mobile Menu */}
          <div className="flex items-center gap-4">
            {user && (
              <Link href="/profile" className="hidden md:block">
                <Avatar className="h-8 w-8">
                  {user.avatar ? <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} /> : null}
                  <AvatarFallback className="bg-blue-600 text-white">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Link>
            )}
            
            {/* Link direto para mensagens no mobile */}
            <Link href="/messages" className="md:hidden">
              <Button variant="ghost" size="icon" className={pathname === "/messages" ? "text-blue-600" : ""}>
                <MessageSquare className="h-6 w-6" />
              </Button>
            </Link>

            {/* Menu hambúrguer apenas no desktop */}
            <Sheet>
              <SheetTrigger asChild className="hidden md:block">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                <nav className="flex flex-col gap-4 pt-6">
                  <Link
                    href="/messages"
                    className={`flex items-center gap-3 text-lg font-medium transition-colors hover:text-blue-600 ${
                      pathname === "/messages" ? "text-blue-600" : "text-gray-600"
                    }`}
                  >
                    <MessageSquare className="h-6 w-6" />
                    Mensagens
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="justify-start gap-3 text-lg font-medium text-gray-600 hover:text-red-600"
                  >
                    Sair
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
        <nav className="flex justify-around h-12 items-center px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center text-xs font-medium transition-colors p-1 ${
                pathname === item.href ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="mt-0.5 text-[10px]">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}

