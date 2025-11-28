"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle } from "lucide-react"
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

  const formatMessageTime = (dateString: string) => {
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
    if (diffInMinutes < 60) return `Online há ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `Online há ${Math.floor(diffInMinutes / 60)}h`
    return `Online há ${Math.floor(diffInMinutes / 1440)} dias`
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-gray-100">
        {conversations.map((conversation) => {
          const otherParticipant = conversation.type === 'direct' 
            ? getOtherParticipant(conversation)
            : null

          // Para grupos
          if (conversation.type === 'group') {
            const groupInfo = (conversation as any).groupInfo
            return (
              <div
                key={conversation._id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedConversation === conversation._id
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => onSelectConversation(conversation._id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={groupInfo?.avatar} alt={groupInfo?.name} />
                    <AvatarFallback className="bg-green-600 text-white">
                      {getInitials(groupInfo?.name || "Grupo")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-black truncate">
                        {groupInfo?.name || "Grupo"}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage.content}
                    </p>
                    <p className="text-xs text-gray-400">
                      {groupInfo?.memberCount || 0} membros
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            )
          }

          // Para conversas diretas
          if (!otherParticipant) return null

          return (
            <div
              key={conversation._id}
              className={`p-4 cursor-pointer transition-colors ${
                selectedConversation === conversation._id
                  ? "bg-blue-50 border-l-4 border-blue-500"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => onSelectConversation(conversation._id)}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-14 w-14">
                    {otherParticipant.avatar && (
                      <AvatarImage
                        src={otherParticipant.avatar}
                        alt={otherParticipant.name}
                      />
                    )}
                    <AvatarFallback className="bg-blue-600 text-white">
                      {getInitials(otherParticipant.name)}
                    </AvatarFallback>
                  </Avatar>
                  {otherParticipant.isOnline && (
                    <div className="absolute -bottom-0 -right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-black truncate">
                      {otherParticipant.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(conversation.lastMessage.createdAt)}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.lastMessage.content}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatLastSeen(otherParticipant.lastSeen)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
