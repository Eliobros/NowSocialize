"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Users } from "lucide-react"
import { Conversation } from "@/types/message"

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: string | null
  currentUserId: string
  onSelectConversation: (conversationId: string) => void
  emptyMessage?: string
}

export function ConversationList({
  conversations,
  selectedConversation,
  currentUserId,
  onSelectConversation,
  emptyMessage = "Nenhuma conversa encontrada"
}: ConversationListProps) {
  
  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p._id !== currentUserId)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } else if (diffInHours < 48) {
      return "Ontem"
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    }
  }

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Offline"

    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Online"
    if (diffInMinutes < 60) return `há ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `há ${Math.floor(diffInMinutes / 60)}h`
    return `há ${Math.floor(diffInMinutes / 1440)}d`
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm text-center">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="py-1">
        {conversations.map((conversation) => {
          const otherParticipant = conversation.type === 'direct' 
            ? getOtherParticipant(conversation)
            : null

          if (conversation.type === 'group') {
            const groupInfo = (conversation as any).groupInfo
            return (
              <div
                key={conversation._id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                  selectedConversation === conversation._id
                    ? "bg-primary/10 border-l-3 border-l-primary"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectConversation(conversation._id)}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={groupInfo?.avatar} alt={groupInfo?.name} />
                    <AvatarFallback className="bg-emerald-600 text-white text-sm">
                      {getInitials(groupInfo?.name || "Grupo")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-card">
                    <Users className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground truncate text-sm">
                      {groupInfo?.name || "Grupo"}
                    </p>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatMessageTime(conversation.lastMessage?.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.lastMessage?.content || "Nenhuma mensagem ainda"}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge className="h-5 min-w-5 rounded-full px-1.5 text-[10px] bg-primary text-primary-foreground">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {groupInfo?.memberCount || 0} membros
                  </p>
                </div>
              </div>
            )
          }

          if (!otherParticipant) return null

          return (
            <div
              key={conversation._id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                selectedConversation === conversation._id
                  ? "bg-primary/10 border-l-3 border-l-primary"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => onSelectConversation(conversation._id)}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  {otherParticipant.avatar && (
                    <AvatarImage
                      src={otherParticipant.avatar}
                      alt={otherParticipant.name}
                    />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(otherParticipant.name)}
                  </AvatarFallback>
                </Avatar>
                {otherParticipant.isOnline && (
                  <div className="absolute -bottom-0 -right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground truncate text-sm">
                    {otherParticipant.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatMessageTime(conversation.lastMessage?.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.lastMessage?.content || "Nenhuma mensagem ainda"}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <Badge className="h-5 min-w-5 rounded-full px-1.5 text-[10px] bg-primary text-primary-foreground">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatLastSeen(otherParticipant.lastSeen)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
