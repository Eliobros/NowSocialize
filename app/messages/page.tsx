"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageCircle, Plus, ArrowLeft, Search, Users } from "lucide-react"
import { CallManager } from "@/components/call/call-manager"
import { CreateGroupModal } from "@/components/groups/CreateGroupModal"
import { GroupInfoModal } from "@/components/groups/GroupInfoModal"
import { ConversationList } from "@/components/messages/ConversationList"
import { ChatWindow } from "@/components/messages/ChatWindow"
import { MessageInput } from "@/components/messages/MessageInput"
import { useSocket } from "@/hooks/use-socket"
import { useMessages } from "@/hooks/use-messages"
import { User, Message } from "@/types/message"

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [currentUserId, setCurrentUserId] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [searchUsers, setSearchUsers] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [replyingTo, setReplyingTo] = useState<any>(null)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [currentUserVerified, setCurrentUserVerified] = useState(false)
  const [currentUserLanguage, setCurrentUserLanguage] = useState("")
  const [tinaMessages, setTinaMessages] = useState<Message[]>([])
  const [tinaLoading, setTinaLoading] = useState(false)

  const TINA_ID = "tina-ia"
  const TINA_SENDER = { _id: TINA_ID, name: "Tina IA", avatar: "/tina.png" }

  const isTinaChat = selectedConversation === TINA_ID

  // Refs to avoid stale closures in socket callbacks
  const currentUserLanguageRef = React.useRef(currentUserLanguage)
  const selectedConversationRef = React.useRef(selectedConversation)
  const currentUserIdRef = React.useRef(currentUserId)
  React.useEffect(() => { currentUserLanguageRef.current = currentUserLanguage }, [currentUserLanguage])
  React.useEffect(() => { selectedConversationRef.current = selectedConversation }, [selectedConversation])
  React.useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])

  const {
    conversations,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startNewConversation,
    addMessage,
    setMessages,
    markConversationRead,
    toggleReaction,
    updateMessageReactions
  } = useMessages()

  const translateMessages = async (msgs: Message[], targetLang: string) => {
    if (!targetLang) return msgs
    
    const translated = await Promise.all(
      msgs.map(async (msg) => {
        if (!msg.content || msg.sender._id === currentUserId || msg.translatedContent) return msg
        try {
          const response = await fetch("https://socket-socializenow.duckdns.org/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg.content, target: targetLang })
          })
          if (response.ok) {
            const data = await response.json()
            if (data.translatedText && data.translatedText !== msg.content) {
              return {
                ...msg,
                translatedContent: data.translatedText,
                originalLanguage: data.detectedLanguage?.language || "??"
              }
            }
          }
        } catch (err) {
          // Translation failed, just show original
        }
        return msg
      })
    )
    return translated
  }

  const { isConnected, joinConversation, leaveConversation, startTyping, stopTyping, markRead, sendReaction } = useSocket({
    userId: currentUserId,
    onNewMessage: (newMessage) => {
      if (newMessage.conversationId === selectedConversationRef.current) {
        const lang = currentUserLanguageRef.current
        const myId = currentUserIdRef.current
        if (lang && newMessage.sender?._id !== myId && newMessage.content) {
          fetch("https://socket-socializenow.duckdns.org/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: newMessage.content, target: lang })
          })
            .then(res => res.json())
            .then(data => {
              if (data.translatedText && data.translatedText !== newMessage.content) {
                addMessage({
                  ...newMessage,
                  translatedContent: data.translatedText,
                  originalLanguage: data.detectedLanguage?.language || "??"
                })
              } else {
                addMessage(newMessage)
              }
            })
            .catch(() => addMessage(newMessage))
        } else {
          addMessage(newMessage)
        }
      }
      fetchConversations()
    },
    onUserStatusChanged: ({ userId, isOnline, lastSeen }) => {
      fetchConversations()
    },
    onUserTyping: ({ userId, conversationId }) => {
      if (conversationId === selectedConversationRef.current) {
        setTypingUsers(prev => {
          const next = new Map(prev)
          // Find user name from conversation participants
          const conv = conversations.find(c => c._id === conversationId)
          const user = conv?.participants.find(p => p._id === userId)
          next.set(userId, user?.name || "Alguém")
          return next
        })
      }
    },
    onUserStopTyping: ({ userId, conversationId }) => {
      if (conversationId === selectedConversationRef.current) {
        setTypingUsers(prev => {
          const next = new Map(prev)
          next.delete(userId)
          return next
        })
      }
    },
    onNewGroup: ({ groupId, conversationId }) => {
      fetchConversations()
    },
    onAddedToGroup: ({ groupId, groupName }) => {
      fetchConversations()
    },
    onMessagesRead: ({ conversationId: convId, userId }) => {
      if (convId === selectedConversationRef.current) {
        setMessages(prev => prev.map(msg => 
          msg.sender._id === currentUserIdRef.current ? { ...msg, read: true, readAt: new Date().toISOString() } : msg
        ))
      }
    },
    onReactionUpdated: ({ conversationId: convId, messageId, emoji, userId, action }) => {
      if (convId === selectedConversationRef.current) {
        setMessages(prev => prev.map(msg => {
          if (msg._id !== messageId) return msg
          let reactions = [...(msg.reactions || [])]
          if (action === 'remove') {
            reactions = reactions.filter(r => !(r.userId === userId && r.emoji === emoji))
          } else {
            reactions = reactions.filter(r => r.userId !== userId)
            reactions.push({ userId, emoji, createdAt: new Date().toISOString() })
          }
          return { ...msg, reactions }
        }))
      }
    },
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setCurrentUserId(payload.userId)
    } catch (error) {
      console.error("Error decoding token:", error)
    }

    fetchConversations()

    const conversationId = searchParams.get("conversation")
    if (conversationId) {
      setSelectedConversation(conversationId)
      fetchMessages(conversationId)
    }
  }, [router, searchParams])

  // Fetch current user data for CallManager
  useEffect(() => {
    if (!currentUserId) return
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("token")
        // Fetch basic user data
        const response = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setCurrentUser({ _id: data._id || currentUserId, name: data.name, username: data.username || "", avatar: data.avatar || "" })
          setCurrentUserVerified(data.isVerified || false)
          setCurrentUserLanguage(data.preferredLanguage || "")
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }
    fetchCurrentUser()
  }, [currentUserId])

  useEffect(() => {
    if (selectedConversation) {
      joinConversation(selectedConversation)
      return () => {
        leaveConversation(selectedConversation)
      }
    }
  }, [selectedConversation])

  useEffect(() => {
    if (!currentUserLanguage || messages.length === 0) return
    
    const needsTranslation = messages.some(
      msg => msg.sender._id !== currentUserId && msg.content && !msg.translatedContent
    )
    
    if (needsTranslation) {
      translateMessages(messages, currentUserLanguage).then(translated => {
        setMessages(translated)
      })
    }
  }, [messages.length, currentUserLanguage])

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedConversation) return
    const result = await toggleReaction(selectedConversation, messageId, emoji)
    if (result) {
      updateMessageReactions(messageId, result.reactions)
      sendReaction(selectedConversation, messageId, emoji, currentUserId, result.action)
    }
  }

  const handleSelectConversation = async (conversationId: string) => {
    setTypingUsers(new Map())
    setSelectedConversation(conversationId)
    if (conversationId === TINA_ID) {
      // Load welcome message if no messages yet
      if (tinaMessages.length === 0) {
        setTinaMessages([{
          _id: "tina-welcome",
          content: "Olá! 👋 Sou a **Tina**, a inteligência artificial da SocializeNow.\n\nPosso te ajudar com dúvidas, ideias, conversas e muito mais. É só me perguntar! 🤖✨",
          sender: TINA_SENDER,
          createdAt: new Date().toISOString(),
          read: true,
        }])
      }
      return
    }
    await fetchMessages(conversationId)
    await markConversationRead(conversationId)
    markRead(conversationId, currentUserId)
    await fetchConversations()
  }

  const handleSendMessage = async (content: string, image?: File) => {
    if (!selectedConversation) return false

    // Tina chat
    if (isTinaChat) {
      const userMsg: Message = {
        _id: `user-${Date.now()}`,
        content,
        sender: { _id: currentUserId, name: currentUser?.name || "Você", avatar: currentUser?.avatar || "" },
        createdAt: new Date().toISOString(),
        read: true,
      }
      setTinaMessages(prev => [...prev, userMsg])
      setTinaLoading(true)

      try {
        const token = localStorage.getItem("token")
        const response = await fetch("/api/tina/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: content })
        })

        const data = await response.json()
        const tinaReply: Message = {
          _id: `tina-${Date.now()}`,
          content: data.response || data.error || "Desculpe, não consegui processar sua mensagem.",
          sender: TINA_SENDER,
          createdAt: new Date().toISOString(),
          read: true,
        }
        setTinaMessages(prev => [...prev, tinaReply])
      } catch {
        setTinaMessages(prev => [...prev, {
          _id: `tina-err-${Date.now()}`,
          content: "Ops! Estou temporariamente indisponível. Tente novamente em alguns segundos. 😅",
          sender: TINA_SENDER,
          createdAt: new Date().toISOString(),
          read: true,
        }])
      } finally {
        setTinaLoading(false)
      }
      return true
    }
    
    const success = await sendMessage(selectedConversation, content, image, replyingTo?._id)
    if (success) {
      setReplyingTo(null)
      await fetchMessages(selectedConversation)
      await fetchConversations()

      // Check for @Tina mention in group chats
      if (selectedConv?.type === "group" && /@tina/i.test(content)) {
        handleTinaMention(content, selectedConversation)
      }
    }
    return success
  }

  const handleTinaMention = async (content: string, conversationId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/tina/group", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: content, conversationId, senderName: currentUser?.name })
      })
      const data = await response.json()
      if (data.response) {
        // Send Tina's reply as a system-like message via the normal send endpoint
        await sendMessage(conversationId, `🤖 Tina: ${data.response}`)
        await fetchMessages(conversationId)
        await fetchConversations()
      }
    } catch (err) {
      console.error("Tina mention error:", err)
    }
  }

  const fetchFollowingSuggestions = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/following?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        return (data.following || []).map((f: any) => ({
          _id: f._id,
          name: f.name,
          username: f.username || "",
          avatar: f.avatar || ""
        }))
      }
    } catch (error) {
      console.error("Erro ao buscar seguindo")
    }
    return []
  }

  const searchUsersForChat = async (query: string) => {
    if (!query.trim()) {
      // Quando não há texto, mostrar quem o usuário segue
      setSearchingUsers(true)
      const suggestions = await fetchFollowingSuggestions()
      setSearchUsers(suggestions)
      setSearchingUsers(false)
      return
    }

    setSearchingUsers(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setSearchUsers(data.users)
      }
    } catch (error) {
      console.error("Erro ao buscar usuários")
    } finally {
      setSearchingUsers(false)
    }
  }

  const handleStartNewConversation = async (userId: string) => {
    const conversationId = await startNewConversation(userId)
    if (conversationId) {
      setSelectedConversation(conversationId)
      await fetchMessages(conversationId)
      await fetchConversations()
      setShowNewChatDialog(false)
      setUserSearchTerm("")
      setSearchUsers([])
    }
  }

  const handleGroupCreated = async (groupId: string, conversationId: string) => {
    await fetchConversations()
    setSelectedConversation(conversationId)
    await fetchMessages(conversationId)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50

    if (!isAtBottom && shouldAutoScroll) {
      setIsUserScrolling(true)
      setShouldAutoScroll(false)
    } else if (isAtBottom && !shouldAutoScroll) {
      setIsUserScrolling(false)
      setShouldAutoScroll(true)
    }
  }

  const handleScrollToBottom = () => {
    setShouldAutoScroll(true)
    setIsUserScrolling(false)
  }

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
  }

  const tinaConversation = isTinaChat ? {
    _id: TINA_ID,
    type: "direct" as const,
    participants: [
      { _id: currentUserId, name: currentUser?.name || "", avatar: currentUser?.avatar || "" },
      { _id: TINA_ID, name: "Tina IA", avatar: "/tina.png", isOnline: true }
    ],
    lastMessage: { content: "", createdAt: new Date().toISOString(), sender: TINA_ID },
    unreadCount: 0
  } : null

  const selectedConv = isTinaChat ? tinaConversation : conversations.find(c => c._id === selectedConversation)
  const isGroupChat = !isTinaChat && selectedConv?.type === 'group'

  const filteredConversations = conversations.filter((conversation) => {
    if (conversation.type === 'group') {
      const groupInfo = (conversation as any).groupInfo
      return groupInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    }
    const otherParticipant = conversation.participants.find((p) => p._id !== currentUserId)
    return otherParticipant?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading && conversations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col fixed inset-0 z-50">
      {/* Navbar só no desktop */}
      <div className="hidden lg:block flex-shrink-0">
        <Navbar />
      </div>
      <div className="flex-1 min-h-0 flex flex-col sm:container sm:mx-auto sm:px-4 sm:py-6 sm:max-w-6xl overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden sm:rounded-xl sm:border border-border sm:shadow-sm">
          {/* Sidebar - Conversation List */}
          <div className={`w-full lg:w-[380px] lg:min-w-[380px] border-r border-border bg-card flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <MessageCircle className="h-5 w-5 text-primary" />
                Mensagens
              </h2>
              <div className="flex gap-1">
                <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-full">
                      <Users className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Dialog open={showNewChatDialog} onOpenChange={(open) => {
                  setShowNewChatDialog(open)
                  if (open && searchUsers.length === 0) {
                    searchUsersForChat("")
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nova Conversa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Buscar usuários..."
                        value={userSearchTerm}
                        onChange={(e) => {
                          setUserSearchTerm(e.target.value)
                          searchUsersForChat(e.target.value)
                        }}
                      />
                      <ScrollArea className="h-60">
                        <div className="space-y-1">
                          {searchUsers.map((user) => (
                            <div
                              key={user._id}
                              className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                              onClick={() => handleStartNewConversation(user._id)}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{user.name}</p>
                                {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Conversations */}
            <ConversationList
              conversations={filteredConversations}
              selectedConversation={selectedConversation}
              currentUserId={currentUserId}
              onSelectConversation={handleSelectConversation}
              tinaLastMessage={tinaMessages.length > 0 ? tinaMessages[tinaMessages.length - 1].content : undefined}
            />
          </div>

          {/* Main - Chat Window */}
          <div className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-background ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
	  <div className="flex-1 min-h-0 overflow-hidden">
            <ChatWindow
              conversation={selectedConv || null}
              messages={isTinaChat ? tinaMessages : messages}
              currentUserId={currentUserId}
              onCall={isTinaChat ? undefined : (type) => {
                const otherParticipant = selectedConv?.participants.find(p => p._id !== currentUserId)
                if (otherParticipant && typeof window !== 'undefined' && (window as any).startCall) {
                  (window as any).startCall(otherParticipant._id, otherParticipant.name, type)
                }
              }}
              onInfo={isGroupChat ? () => setShowGroupInfo(true) : undefined}
              onBack={handleBackToList}
              isUserScrolling={isUserScrolling}
              shouldAutoScroll={shouldAutoScroll}
              onScroll={handleScroll}
              onScrollToBottom={handleScrollToBottom}
              onReplyMessage={isTinaChat ? undefined : (msg) => setReplyingTo(msg)}
              typingUsers={tinaLoading ? ["Tina IA"] : Array.from(typingUsers.values())}
              onReaction={isTinaChat ? undefined : handleReaction}
              isVerifiedUser={true}
              preferredLanguage={currentUserLanguage}
              onLanguageChange={async (lang) => {
                setCurrentUserLanguage(lang)
                try {
                  const token = localStorage.getItem("token")
                  await fetch("/api/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name: currentUser?.name, preferredLanguage: lang })
                  })
                } catch {}
                if (lang && selectedConversation) {
                  await fetchMessages(selectedConversation)
                }
              }}
            />
	    </div>
            {selectedConversation && (
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={tinaLoading}
                placeholder={isTinaChat ? "Pergunte algo à Tina..." : "Digite sua mensagem..."}
                replyingTo={isTinaChat ? null : replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onTypingStart={isTinaChat ? undefined : () => startTyping(selectedConversation)}
                onTypingStop={isTinaChat ? undefined : () => stopTyping(selectedConversation)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateGroupModal
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onGroupCreated={handleGroupCreated}
      />

      {isGroupChat && selectedConversation && (
        <GroupInfoModal
          open={showGroupInfo}
          onOpenChange={setShowGroupInfo}
          groupId={(selectedConv as any)?.groupId}
          currentUserId={currentUserId}
        />
      )}

      {currentUserId && currentUser && (
        <CallManager currentUserId={currentUserId} currentUserName={currentUser.name} />
      )}
    </div>
  )
}
