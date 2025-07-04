"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Bell, Heart, MessageCircle, UserPlus, Check } from "lucide-react"

interface Notification {
  _id: string
  type: "like" | "comment" | "follow" | "mention"
  message: string
  from: {
    _id: string
    name: string
    username: string
    avatar: string
  }
  read: boolean
  createdAt: string
  postId?: string
  targetUrl?: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchNotifications()

    // Simular notificações em tempo real
    const interval = setInterval(fetchNotifications, 30000) // Atualiza a cada 30 segundos

    return () => clearInterval(interval)
  }, [router])

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      } else {
        setError("Erro ao carregar notificações")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setNotifications((prev) => prev.map((notif) => (notif._id === notificationId ? { ...notif, read: true } : notif)))
    } catch (error) {
      console.error("Erro ao marcar como lida")
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token")
      await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
    } catch (error) {
      console.error("Erro ao marcar todas como lidas")
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como lida se não estiver
    if (!notification.read) {
      await markAsRead(notification._id)
    }

    // Navegar baseado no tipo de notificação
    switch (notification.type) {
      case "follow":
        router.push(`/profile/${notification.from._id}`)
        break
      case "like":
      case "comment":
        if (notification.postId) {
          // Por enquanto, vamos para o feed já que não temos página individual de post
          router.push(`/feed`)
        }
        break
      case "mention":
        if (notification.targetUrl) {
          router.push(notification.targetUrl)
        }
        break
      default:
        break
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500" />
      case "comment":
        return <MessageCircle className="h-5 w-5 text-blue-500" />
      case "follow":
        return <UserPlus className="h-5 w-5 text-green-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Agora há pouco"
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d atrás`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-6 w-6" />
                Notificações
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Check className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Marcar todas como lidas</span>
                  <span className="xs:hidden">Marcar como lidas</span>
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification._id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.read ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                      {notification.from.avatar ? (
                        <AvatarImage
                          src={notification.from.avatar || "/placeholder.svg"}
                          alt={notification.from.name}
                        />
                      ) : null}
                      <AvatarFallback className="bg-blue-600 text-white">
                        {getInitials(notification.from.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                        {getNotificationIcon(notification.type)}
                        <span className="font-medium text-sm sm:text-base break-words">{notification.from.name}</span>
                        {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                      </div>
                      <p className="text-xs sm:text-sm mb-2 break-words leading-relaxed">{notification.message}</p>
                      <p className="text-muted-foreground text-xs leading-none">{formatDate(notification.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
