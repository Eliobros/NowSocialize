"use client"

import React, { useRef, useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Phone, Video, Info, ArrowDown, ArrowLeft, MessageCircle, Languages, Check, CheckCheck } from "lucide-react"
import { Message, Conversation } from "@/types/message"

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡"]

const LANGUAGES = [
  { code: "", label: "Desativado" },
  { code: "pt", label: "Português" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "de", label: "Alemão" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "Japonês" },
  { code: "ko", label: "Coreano" },
  { code: "zh", label: "Chinês" },
  { code: "ar", label: "Árabe" },
  { code: "ru", label: "Russo" },
  { code: "hi", label: "Hindi" },
  { code: "tr", label: "Turco" },
  { code: "nl", label: "Holandês" },
  { code: "pl", label: "Polonês" },
  { code: "sv", label: "Sueco" },
]

interface ChatWindowProps {
  conversation: Conversation | null
  messages: Message[]
  currentUserId: string
  onCall?: (type: "audio" | "video") => void
  onInfo?: () => void
  onBack?: () => void
  isUserScrolling: boolean
  shouldAutoScroll: boolean
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  onScrollToBottom: () => void
  onReplyMessage?: (message: Message) => void
  onReaction?: (messageId: string, emoji: string) => void
  typingUsers?: string[]
  isVerifiedUser?: boolean
  preferredLanguage?: string
  onLanguageChange?: (lang: string) => void
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onCall,
  onInfo,
  onBack,
  isUserScrolling,
  shouldAutoScroll,
  onScroll,
  onScrollToBottom,
  onReplyMessage,
  onReaction,
  typingUsers = [],
  isVerifiedUser = false,
  preferredLanguage = "",
  onLanguageChange
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set())
  const [showLangPicker, setShowLangPicker] = useState(false)

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

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Hoje"
    if (diffInDays === 1) return "Ontem"
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Offline"

    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Online"
    if (diffInMinutes < 60) return `visto há ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `visto há ${Math.floor(diffInMinutes / 60)}h`
    return `visto há ${Math.floor(diffInMinutes / 1440)} dias`
  }

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p._id !== currentUserId)
  }

  const toggleOriginal = (messageId: string) => {
    setShowOriginal(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const getReactionCounts = (reactions?: { userId: string; emoji: string }[]) => {
    if (!reactions || reactions.length === 0) return []
    const counts = new Map<string, { count: number; userReacted: boolean }>()
    reactions.forEach(r => {
      const existing = counts.get(r.emoji) || { count: 0, userReacted: false }
      existing.count++
      if (r.userId === currentUserId) existing.userReacted = true
      counts.set(r.emoji, existing)
    })
    return Array.from(counts.entries()).map(([emoji, data]) => ({ emoji, ...data }))
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Suas mensagens</h3>
          <p className="text-muted-foreground text-sm">Selecione uma conversa para começar</p>
        </div>
      </div>
    )
  }

  const isGroup = conversation.type === 'group'
  const otherParticipant = !isGroup ? getOtherParticipant(conversation) : null
  const groupInfo = isGroup ? (conversation as any).groupInfo : null

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card px-3 py-2.5 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0 rounded-full" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="relative">
              <Avatar className="h-10 w-10">
                {isGroup ? (
                  <>
                    <AvatarImage src={groupInfo?.avatar} alt={groupInfo?.name} />
                    <AvatarFallback className="bg-emerald-600 text-white text-sm">
                      {getInitials(groupInfo?.name || "Grupo")}
                    </AvatarFallback>
                  </>
                ) : otherParticipant ? (
                  <>
                    <AvatarImage
                      src={otherParticipant.avatar}
                      alt={otherParticipant.name}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(otherParticipant.name)}
                    </AvatarFallback>
                  </>
                ) : null}
              </Avatar>
              {!isGroup && otherParticipant?.isOnline && (
                <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full"></div>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {isGroup ? groupInfo?.name || "Grupo" : otherParticipant?.name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isGroup 
                  ? `${groupInfo?.memberCount || 0} membros`
                  : otherParticipant?.isOnline 
                    ? "Online" 
                    : formatLastSeen(otherParticipant?.lastSeen)
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isGroup && onCall && (
              <>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full text-muted-foreground hover:text-primary" onClick={() => onCall("audio")}>
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full text-muted-foreground hover:text-primary" onClick={() => onCall("video")}>
                  <Video className="h-5 w-5" />
                </Button>
              </>
            )}
            {isVerifiedUser && onLanguageChange && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 rounded-full ${preferredLanguage ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
                  onClick={() => setShowLangPicker(!showLangPicker)}
                  title="Tradução automática"
                >
                  <Languages className="h-5 w-5" />
                </Button>
                {showLangPicker && (
                  <div className="absolute right-0 top-11 z-50 bg-card border border-border rounded-xl shadow-lg w-48 max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-border">
                      <p className="text-[11px] font-semibold text-muted-foreground px-2">🌍 Traduzir para</p>
                    </div>
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${
                          preferredLanguage === lang.code ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                        }`}
                        onClick={() => {
                          onLanguageChange(lang.code)
                          setShowLangPicker(false)
                        }}
                      >
                        {lang.label}
                        {preferredLanguage === lang.code && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {onInfo && (
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full text-muted-foreground hover:text-primary" onClick={onInfo}>
                <Info className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-muted/20">
        <div
          className="h-full overflow-y-auto px-3 sm:px-4 py-3"
          onScroll={onScroll}
          style={{ scrollBehavior: isUserScrolling ? "auto" : "smooth" }}
        >
          <div className="space-y-1 min-h-full flex flex-col justify-end">
            {messages.map((message, index) => {
              const showTimestamp =
                index === 0 ||
                new Date(messages[index - 1].createdAt).getDate() !==
                  new Date(message.createdAt).getDate()

              const isMe = message.sender._id === currentUserId
              const showAvatar = !isMe && (
                index === messages.length - 1 ||
                messages[index + 1]?.sender._id !== message.sender._id ||
                new Date(messages[index + 1]?.createdAt).getDate() !== new Date(message.createdAt).getDate()
              )

              const reactionCounts = getReactionCounts(message.reactions)
              const hasTranslation = message.translatedContent && message.translatedContent !== message.content
              const showingOriginal = showOriginal.has(message._id)

              return (
                <div key={message._id}>
                  {showTimestamp && (
                    <div className="text-center my-4">
                      <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {formatDateSeparator(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-end gap-1.5 mb-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && (
                      <div className="w-7 flex-shrink-0">
                        {showAvatar && (
                          <Avatar className="h-7 w-7">
                            {message.sender.avatar && (
                              <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
                            )}
                            <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                              {getInitials(message.sender.name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div className="relative max-w-[75%]">
                      <div
                        className={`px-3 py-2 ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                            : "bg-card text-card-foreground border border-border rounded-2xl rounded-bl-md"
                        }`}
                      >
                        {isGroup && !isMe && (
                          <p className={`text-[11px] font-semibold mb-0.5 ${isMe ? "text-primary-foreground/70" : "text-primary"}`}>
                            {message.sender.name}
                          </p>
                        )}
                        {message.replyTo && (
                          <div className={`mb-1.5 px-2 py-1 rounded border-l-2 ${
                            isMe ? "border-primary-foreground/40 bg-primary-foreground/10" : "border-primary/40 bg-primary/5"
                          }`}>
                            <p className={`text-[10px] font-semibold ${isMe ? "text-primary-foreground/70" : "text-primary"}`}>
                              {message.replyTo.sender.name}
                            </p>
                            <p className={`text-[11px] truncate ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {message.replyTo.content}
                            </p>
                          </div>
                        )}
                        {message.image && (
                          <img
                            src={message.image}
                            alt="Imagem"
                            className="w-full max-w-xs rounded-lg mb-1.5 cursor-pointer"
                            onClick={() => window.open(message.image, "_blank")}
                          />
                        )}
                        {message.content && (
                          <p className="text-sm break-words leading-relaxed">
                            {hasTranslation && !showingOriginal ? message.translatedContent : message.content}
                          </p>
                        )}
                        {/* Translation indicator */}
                        {hasTranslation && (
                          <button
                            onClick={() => toggleOriginal(message._id)}
                            className={`flex items-center gap-1 mt-1 text-[10px] ${
                              isMe ? "text-primary-foreground/50 hover:text-primary-foreground/80" : "text-muted-foreground hover:text-foreground"
                            } transition-colors`}
                          >
                            <Languages className="h-3 w-3" />
                            {showingOriginal 
                              ? "Ver tradução" 
                              : `Original (${message.originalLanguage || "??"})`
                            }
                          </button>
                        )}
                        <div className={`flex items-center gap-1 mt-1 justify-end`}>
                          <span className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatTime(message.createdAt)}
                          </span>
                          {/* Read receipt indicators */}
                          {isMe && (
                            <span className={`flex items-center ${message.read ? "text-blue-400" : isMe ? "text-primary-foreground/40" : "text-muted-foreground/40"}`}>
                              {message.read ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-0.5">
                          {onReplyMessage && (
                            <button
                              className={`text-[10px] ${isMe ? "text-primary-foreground/50 hover:text-primary-foreground/80" : "text-muted-foreground hover:text-foreground"}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                onReplyMessage(message)
                              }}
                            >
                              Responder
                            </button>
                          )}
                          {onReaction && (
                            <button
                              className={`text-[10px] ${isMe ? "text-primary-foreground/50 hover:text-primary-foreground/80" : "text-muted-foreground hover:text-foreground"}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowReactionPicker(showReactionPicker === message._id ? null : message._id)
                              }}
                            >
                              😀
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reaction picker popup */}
                      {showReactionPicker === message._id && onReaction && (
                        <div className={`absolute z-30 ${isMe ? "right-0" : "left-8"} -top-10 bg-card border border-border rounded-full shadow-lg px-2 py-1 flex gap-1`}>
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              className="text-lg hover:scale-125 transition-transform px-0.5"
                              onClick={(e) => {
                                e.stopPropagation()
                                onReaction(message._id, emoji)
                                setShowReactionPicker(null)
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Reactions display */}
                      {reactionCounts.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                          {reactionCounts.map(({ emoji, count, userReacted }) => (
                            <button
                              key={emoji}
                              onClick={() => onReaction?.(message._id, emoji)}
                              className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                                userReacted
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <span>{emoji}</span>
                              {count > 1 && <span className="text-[10px]">{count}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1.5 mb-0.5 px-1">
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2">
                  <p className="text-xs text-muted-foreground italic">
                    {typingUsers.length === 1
                      ? `${typingUsers[0]} está digitando`
                      : `${typingUsers.join(", ")} estão digitando`}
                    <span className="animate-pulse">...</span>
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
          </div>
        </div>

        {/* Scroll to bottom button */}
        {!shouldAutoScroll && (
          <div className="absolute bottom-4 right-4 z-20">
            <Button
              size="sm"
              className="rounded-full h-10 w-10 p-0 bg-primary hover:bg-primary/90 shadow-lg"
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
