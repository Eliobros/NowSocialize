"use client"

import React, { useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Phone, Video, Info, ArrowDown, MessageCircle } from "lucide-react"
import { Message, Conversation } from "@/types/message"

interface ChatWindowProps {
  conversation: Conversation | null
  messages: Message[]
  currentUserId: string
  onCall?: (type: "audio" | "video") => void
  onInfo?: () => void
  isUserScrolling: boolean
  shouldAutoScroll: boolean
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  onScrollToBottom: () => void
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onCall,
  onInfo,
  isUserScrolling,
  shouldAutoScroll,
  onScroll,
  onScrollToBottom
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shouldAutoScroll && !isUserScrolling && messages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [messages, shouldAutoScroll, isUserScrolling])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return formatTime(dateString)
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

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p._id !== currentUserId)
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Selecione uma conversa para começar</p>
        </div>
      </div>
    )
  }

  const isGroup = conversation.type === 'group'
  const otherParticipant = !isGroup ? getOtherParticipant(conversation) : null
  const groupInfo = isGroup ? (conversation as any).groupInfo : null

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                {isGroup ? (
                  <>
                    <AvatarImage src={groupInfo?.avatar} alt={groupInfo?.name} />
                    <AvatarFallback className="bg-green-600 text-white">
                      {getInitials(groupInfo?.name || "Grupo")}
                    </AvatarFallback>
                  </>
                ) : otherParticipant ? (
                  <>
                    <AvatarImage
                      src={otherParticipant.avatar}
                      alt={otherParticipant.name}
                    />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {getInitials(otherParticipant.name)}
                    </AvatarFallback>
                  </>
                ) : null}
              </Avatar>
              {!isGroup && otherParticipant?.isOnline && (
                <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div>
              <p className="font-semibold text-black">
                {isGroup ? groupInfo?.name || "Grupo" : otherParticipant?.name || "Usuário"}
              </p>
              <p className="text-sm text-gray-500">
                {isGroup 
                  ? `${groupInfo?.memberCount || 0} membros`
                  : formatLastSeen(otherParticipant?.lastSeen)
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isGroup && onCall && (
              <>
                <Phone
                  className="h-6 w-6 text-gray-600 cursor-pointer hover:text-blue-600"
                  onClick={() => onCall("audio")}
                />
                <Video
                  className="h-6 w-6 text-gray-600 cursor-pointer hover:text-blue-600"
                  onClick={() => onCall("video")}
                />
              </>
            )}
            {onInfo && (
              <Info
                className="h-6 w-6 text-gray-600 cursor-pointer hover:text-blue-600"
                onClick={onInfo}
              />
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="h-full overflow-y-auto px-4 py-2"
          onScroll={onScroll}
          style={{ scrollBehavior: isUserScrolling ? "auto" : "smooth" }}
        >
          <div className="space-y-4 min-h-full flex flex-col justify-end">
            {messages.map((message, index) => {
              const showTimestamp =
                index === 0 ||
                new Date(messages[index - 1].createdAt).getDate() !==
                  new Date(message.createdAt).getDate()

              return (
                <div key={message._id}>
                  {showTimestamp && (
                    <div className="text-center my-4">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex ${
                      message.sender._id === currentUserId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {message.sender._id !== currentUserId && (
                      <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                        {message.sender.avatar && (
                          <AvatarImage
                            src={message.sender.avatar}
                            alt={message.sender.name}
                          />
                        )}
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {getInitials(message.sender.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                        message.sender._id === currentUserId
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-gray-200 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      {isGroup && message.sender._id !== currentUserId && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {message.sender.name}
                        </p>
                      )}
                      {message.image && (
                        <img
                          src={message.image}
                          alt="Imagem"
                          className="w-full max-w-xs rounded-lg mb-2 cursor-pointer"
                          onClick={() => window.open(message.image, "_blank")}
                        />
                      )}
                      {message.content && (
                        <p className="text-sm break-words">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
          </div>
        </div>

        {/* Scroll to bottom button */}
        {!shouldAutoScroll && (
          <div className="absolute bottom-4 right-4 z-20">
            <Button
              size="sm"
              className="rounded-full h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600 shadow-lg"
              onClick={onScrollToBottom}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
