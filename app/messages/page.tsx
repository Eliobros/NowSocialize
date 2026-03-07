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
import { User } from "@/types/message"

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

  const {
    conversations,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startNewConversation,
    addMessage,
    setMessages
  } = useMessages()

  const { isConnected, joinConversation, leaveConversation, startTyping, stopTyping } = useSocket({
    userId: currentUserId,
    onNewMessage: (newMessage) => {
      if (newMessage.conversationId === selectedConversation) {
        addMessage(newMessage)
      }
      fetchConversations()
    },
    onUserStatusChanged: ({ userId, isOnline, lastSeen }) => {
      fetchConversations()
    },
    onUserTyping: ({ userId, conversationId }) => {
      if (conversationId === selectedConversation) {
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
      if (conversationId === selectedConversation) {
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
    }
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
        const response = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setCurrentUser({ _id: data._id, name: data.name, username: data.username || "", avatar: data.avatar || "" })
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

  const handleSelectConversation = async (conversationId: string) => {
    setTypingUsers(new Map())
    setSelectedConversation(conversationId)
    await fetchMessages(conversationId)
  }

  const handleSendMessage = async (content: string, image?: File) => {
    if (!selectedConversation) return false
    
    const success = await sendMessage(selectedConversation, content, image, replyingTo?._id)
    if (success) {
      setReplyingTo(null)
      await fetchMessages(selectedConversation)
      await fetchConversations()
    }
    return success
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

  const selectedConv = conversations.find(c => c._id === selectedConversation)
  const isGroupChat = selectedConv?.type === 'group'

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
    <div className="min-h-screen bg-background">
      {/* Esconder navbar e bottom nav no mobile quando estiver numa conversa */}
      <div className={selectedConversation ? 'hidden lg:block' : ''}>
        <Navbar />
      </div>
      <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-6 max-w-6xl">
        <div className={`flex ${selectedConversation ? 'h-screen lg:h-[calc(100vh-8rem)]' : 'h-[calc(100vh-4rem)] sm:h-[calc(100vh-8rem)]'} overflow-hidden sm:rounded-xl sm:border border-border sm:shadow-sm`}>
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
            />
          </div>

          {/* Main - Chat Window */}
          <div className={`flex-1 flex flex-col bg-background ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
            <ChatWindow
              conversation={selectedConv || null}
              messages={messages}
              currentUserId={currentUserId}
              onCall={(type) => {
                const otherParticipant = selectedConv?.participants.find(p => p._id !== currentUserId)
                if (otherParticipant && typeof window !== 'undefined' && (window as any).startCall) {
                  (window as any).startCall(otherParticipant._id, otherParticipant.name, type)
                }
              }}
              onInfo={() => isGroupChat && setShowGroupInfo(true)}
              onBack={handleBackToList}
              isUserScrolling={isUserScrolling}
              shouldAutoScroll={shouldAutoScroll}
              onScroll={handleScroll}
              onScrollToBottom={handleScrollToBottom}
              onReplyMessage={(msg) => setReplyingTo(msg)}
              typingUsers={Array.from(typingUsers.values())}
            />

            {selectedConversation && (
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={false}
                placeholder="Digite sua mensagem..."
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onTypingStart={() => selectedConversation && startTyping(selectedConversation)}
                onTypingStop={() => selectedConversation && stopTyping(selectedConversation)}
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
