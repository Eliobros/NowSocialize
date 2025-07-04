"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Home, User, LogOut, Bell, MessageCircle, Search, Moon, Sun, Settings } from "lucide-react"
import { useTheme } from "next-themes"

interface UserData {
  name: string
  email: string
  avatar?: string
  isVerified: boolean
}

export function Navbar() {
  const [user, setUser] = useState<UserData | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      fetchUserData()
      fetchUnreadCounts()

      // Atualizar contadores a cada 30 segundos
      const interval = setInterval(fetchUnreadCounts, 30000)
      return () => clearInterval(interval)
    }
  }, [])

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
        setUser({
          name: data.profile.name,
          email: data.profile.email,
          avatar: data.profile.avatar,
          isVerified: data.profile.isVerified,
        })
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  const fetchUnreadCounts = async () => {
    try {
      const token = localStorage.getItem("token")

      // Buscar notificações não lidas
      const notificationsResponse = await fetch("/api/notifications/unread-count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        setUnreadNotifications(notificationsData.count)
      }

      // Buscar mensagens não lidas
      const messagesResponse = await fetch("/api/messages/unread-count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        setUnreadMessages(messagesData.count)
      }
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const isActive = (path: string) => pathname === path

  return (
    <>
      {/* Top Navbar - Desktop e Mobile */}
      <nav className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/feed" className="text-xl md:text-2xl font-bold">
              Socialize<span className="text-blue-600">Now</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/feed">
                <Button variant={isActive("/feed") ? "default" : "ghost"} size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  Feed
                </Button>
              </Link>

              <Link href="/search">
                <Button variant={isActive("/search") ? "default" : "ghost"} size="sm" className="gap-2">
                  <Search className="h-4 w-4" />
                  Pesquisar
                </Button>
              </Link>

              <Link href="/notifications">
                <Button variant={isActive("/notifications") ? "default" : "ghost"} size="sm" className="gap-2 relative">
                  <Bell className="h-4 w-4" />
                  Notificações
                  {unreadNotifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </Badge>
                  )}
                </Button>
              </Link>

              <Link href="/messages">
                <Button variant={isActive("/messages") ? "default" : "ghost"} size="sm" className="gap-2 relative">
                  <MessageCircle className="h-4 w-4" />
                  Mensagens
                  {unreadMessages > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </Badge>
                  )}
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle - Desktop Only */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hidden md:flex"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              {/* Desktop User Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full hidden md:flex">
                      <Avatar className="h-8 w-8">
                        {user?.avatar ? <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} /> : null}
                        <AvatarFallback className="bg-blue-600 text-white">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.name}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Mobile Menu Button */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full md:hidden">
                      <Avatar className="h-8 w-8">
                        {user?.avatar ? <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} /> : null}
                        <AvatarFallback className="bg-blue-600 text-white">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.name}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                      {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                      {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation - Mobile Only (Instagram Style) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50 md:hidden">
        <div className="flex items-center justify-around py-2 px-2">
          {/* Home */}
          <Link href="/feed" className="flex-1 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className={`w-12 h-12 p-0 rounded-full ${
                isActive("/feed") ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Home className={`h-6 w-6 ${isActive("/feed") ? "fill-current" : ""}`} />
            </Button>
          </Link>

          {/* Search */}
          <Link href="/search" className="flex-1 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className={`w-12 h-12 p-0 rounded-full ${
                isActive("/search") ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Search className={`h-6 w-6 ${isActive("/search") ? "fill-current" : ""}`} />
            </Button>
          </Link>

          {/* Notifications */}
          <Link href="/notifications" className="flex-1 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className={`w-12 h-12 p-0 rounded-full relative ${
                isActive("/notifications") ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Bell className={`h-6 w-6 ${isActive("/notifications") ? "fill-current" : ""}`} />
              {unreadNotifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center min-w-[20px]"
                >
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Messages */}
          <Link href="/messages" className="flex-1 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className={`w-12 h-12 p-0 rounded-full relative ${
                isActive("/messages") ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <MessageCircle className={`h-6 w-6 ${isActive("/messages") ? "fill-current" : ""}`} />
              {unreadMessages > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center min-w-[20px]"
                >
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Profile */}
          <Link href="/profile" className="flex-1 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className={`w-12 h-12 p-0 rounded-full ${
                isActive("/profile") ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
            >
              <Avatar className="h-8 w-8">
                {user?.avatar ? <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user?.name || ""} /> : null}
                <AvatarFallback className="bg-blue-600 text-white text-sm">
                  {user ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}
