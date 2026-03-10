// hooks/use-messages.ts
import { useState, useCallback } from 'react'
import { Message, Conversation } from '@/types/message'

export function useMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      } else {
        setError("Erro ao carregar conversas")
      }
    } catch (err) {
      setError("Erro de conexão")
      console.error("Fetch conversations error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      } else {
        setError("Erro ao carregar mensagens")
      }
    } catch (err) {
      setError("Erro de conexão")
      console.error("Fetch messages error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    image?: File,
    replyToId?: string
  ) => {
    try {
      const token = localStorage.getItem("token")

      if (image) {
        const formData = new FormData()
        formData.append("conversationId", conversationId)
        formData.append("content", content)
        formData.append("image", image)
        if (replyToId) formData.append("replyToId", replyToId)

        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })

        return response.ok
      } else {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            conversationId,
            content,
            replyToId
          })
        })

        return response.ok
      }
    } catch (err) {
      console.error("Send message error:", err)
      return false
    }
  }, [])

  const startNewConversation = useCallback(async (userId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        const data = await response.json()
        return data.conversationId
      }
      return null
    } catch (err) {
      console.error("Start conversation error:", err)
      return null
    }
  }, [])

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  const markConversationRead = useCallback(async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/messages/${conversationId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error("Mark read error:", err)
    }
  }, [])

  const toggleReaction = useCallback(async (conversationId: string, messageId: string, emoji: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/messages/${conversationId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messageId, emoji })
      })
      if (response.ok) {
        const data = await response.json()
        return data
      }
      return null
    } catch (err) {
      console.error("Toggle reaction error:", err)
      return null
    }
  }, [])

  const updateMessageReactions = useCallback((messageId: string, reactions: any[]) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId ? { ...msg, reactions } : msg
    ))
  }, [])

  const updateConversations = useCallback((updatedConversation: Conversation) => {
    setConversations(prev => {
      const exists = prev.find(c => c._id === updatedConversation._id)
      if (exists) {
        return prev.map(c => 
          c._id === updatedConversation._id ? updatedConversation : c
        )
      }
      return [updatedConversation, ...prev]
    })
  }, [])

  return {
    conversations,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startNewConversation,
    addMessage,
    updateConversations,
    markConversationRead,
    toggleReaction,
    updateMessageReactions,
    setMessages,
    setConversations
  }
}
