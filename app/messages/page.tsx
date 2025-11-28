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

  // Custom hooks
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

  // Socket hook
  const { isConnected, joinConversation, leaveConversation } = useSocket({
    userId: currentUserId,
    onNewMessage: (newMessage) => {
      console.log('📨 Nova mensagem:', newMessage)
      if (newMessage.conversationId === selectedConversation) {
        addMessage(newMessage)
      }
      fetchConversations()
    },
    onUserStatusChanged: ({ userId, isOnline, lastSeen }) => {
      console.log(`👤 Status: ${userId} - ${isOnline ? 'Online' : 'Offline'}`)
      // Atualizar status nas conversas se necessário
    },
    onNewGroup: ({ groupId, conversationId }) => {
      console.log('🆕 Novo grupo criado')
      fetchConversations()
    },
    onAddedToGroup: ({ groupId, groupName }) => {
      console.log(`✅ Adicionado ao grupo: ${groupName}`)
      fetchConversations()
    }
  })

  // Initialize
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

  // Join/Leave conversation
  useEffect(() => {
    if (selectedConversation) {
      joinConversation(selectedConversation)
      return () => {
        leaveConversation(selectedConversation)
      }
    }
  }, [selectedConversation])

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversation(conversationId)
    await fetchMessages(conversationId)
  }

  const handleSendMessage = async (content: string, image?: File) => {
    if (!selectedConversation) return false
    
    const success = await sendMessage(selectedConversation, content, image)
    if (success) {
      await fetchMessages(selectedConversation)
      await fetchConversations()
    }
    return success
  }

  const searchUsersForChat = async (query: string) => {
    if (!query.trim()) {
      setSearchUsers([])
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

  const selectedConv = conversations.find(c => c._id === selectedConversation)
  const isGroupChat = selectedConv?.type === 'group'

  const filteredConversations = conversations.filter((conversation) => {
    if (conversation.type === 'group') {
      const groupInfo = (conversation as any).groupInfo
      return groupInfo?.name.toLowerCase().includes(searchTerm.toLowerCase())
    }
    const otherParticipant = conversation.participants.find((p) => p._id !== currentUserId)
    return otherParticipant?.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading && conversations.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Lista de Conversas */}
          <div className="lg:col-span-1 h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="flex items-center gap-2 font-semibold">
                <MessageCircle className="h-5 w-5" />
                Mensagens
              </h2>
              <div className="flex gap-2">
                <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Users className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 w-8 p-0">
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
                        <div className="space-y-2">
                          {searchUsers.map((user) => (
                            <div
                              key={user._id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                              onClick={() => handleStartNewConversation(user._id)}
                            >
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="bg-blue-600 text-white">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                {user.username && <p className="text-sm text-gray-500">@{user.username}</p>}
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
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista de conversas */}
            <ConversationList
              conversations={filteredConversations}
              selectedConversation={selectedConversation}
              currentUserId={currentUserId}
              onSelectConversation={handleSelectConversation}
            />
          </div>

          {/* Main - Chat Window */}
          <div className="lg:col-span-2 h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border flex flex-col">
            <ChatWindow
              conversation={selectedConv || null}
              messages={messages}
              currentUserId={currentUserId}
              onCall={(type) => console.log("Call:", type)}
              onInfo={() => isGroupChat && setShowGroupInfo(true)}
              isUserScrolling={isUserScrolling}
              shouldAutoScroll={shouldAutoScroll}
              onScroll={handleScroll}
              onScrollToBottom={handleScrollToBottom}
            />

            {selectedConversation && (
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={!isConnected}
                placeholder="Digite sua mensagem..."
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

      {/* Call Manager */}
      {currentUserId && currentUser && (
        <CallManager currentUserId={currentUserId} currentUserName={currentUser.name} />
      )}
    </div>
  )
}
