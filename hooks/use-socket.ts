// hooks/use-socket.ts
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  userId: string
  onNewMessage?: (message: any) => void
  onUserStatusChanged?: (data: { userId: string; isOnline: boolean; lastSeen?: string }) => void
  onUserTyping?: (data: { userId: string; conversationId: string }) => void
  onUserStopTyping?: (data: { userId: string; conversationId: string }) => void
  onNewGroup?: (data: any) => void
  onGroupUpdated?: (data: any) => void
  onMembersAdded?: (data: any) => void
  onMemberRemoved?: (data: any) => void
  onMemberPromoted?: (data: any) => void
  onMemberDemoted?: (data: any) => void
  onGroupDeleted?: (data: any) => void
  onAddedToGroup?: (data: any) => void
  onRemovedFromGroup?: (data: any) => void
  onPromotedToAdmin?: (data: any) => void
  onDemotedFromAdmin?: (data: any) => void
  onMessagesRead?: (data: { conversationId: string; userId: string; readAt: string }) => void
  onReactionUpdated?: (data: { conversationId: string; messageId: string; emoji: string; userId: string; action: string }) => void
}

export function useSocket(options: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token || !options.userId) return

    // Criar conexão socket
    socketRef.current = io('https://socket-socializenow.duckdns.org', {
      transports: ['websocket', 'polling'],
      secure: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token }
    })

    const socket = socketRef.current

    // Eventos de conexão
    socket.on('connect', () => {
      console.log('✅ Socket conectado:', socket.id)
      setIsConnected(true)
      setConnectionError(null)
      
      // Entrar na sala do usuário
      socket.emit('join', options.userId)
    })

    socket.on('connect_error', (error) => {
      console.error('❌ Erro ao conectar:', error.message)
      setConnectionError(error.message)
      setIsConnected(false)
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado:', reason)
      setIsConnected(false)
    })

    // Eventos de mensagens
    if (options.onNewMessage) {
      socket.on('new_message', options.onNewMessage)
    }

    // Eventos de status de usuário
    if (options.onUserStatusChanged) {
      socket.on('user-status-changed', options.onUserStatusChanged)
    }

    // Eventos de typing
    if (options.onUserTyping) {
      socket.on('user_typing', options.onUserTyping)
    }
    if (options.onUserStopTyping) {
      socket.on('user_stop_typing', options.onUserStopTyping)
    }

    // Eventos de grupos
    if (options.onNewGroup) {
      socket.on('new_group', options.onNewGroup)
    }

    if (options.onGroupUpdated) {
      socket.on('group_updated', options.onGroupUpdated)
    }

    if (options.onMembersAdded) {
      socket.on('members_added', options.onMembersAdded)
    }

    if (options.onMemberRemoved) {
      socket.on('member_removed', options.onMemberRemoved)
    }

    if (options.onMemberPromoted) {
      socket.on('member_promoted', options.onMemberPromoted)
    }

    if (options.onMemberDemoted) {
      socket.on('member_demoted', options.onMemberDemoted)
    }

    if (options.onGroupDeleted) {
      socket.on('group_deleted', options.onGroupDeleted)
    }

    if (options.onAddedToGroup) {
      socket.on('added_to_group', options.onAddedToGroup)
    }

    if (options.onRemovedFromGroup) {
      socket.on('removed_from_group', options.onRemovedFromGroup)
    }

    if (options.onPromotedToAdmin) {
      socket.on('promoted_to_admin', options.onPromotedToAdmin)
    }

    if (options.onDemotedFromAdmin) {
      socket.on('demoted_from_admin', options.onDemotedFromAdmin)
    }

    if (options.onMessagesRead) {
      socket.on('messages_read', options.onMessagesRead)
    }
    if (options.onReactionUpdated) {
      socket.on('reaction_updated', options.onReactionUpdated)
    }

    // Keep-alive: enviar atividade a cada 30 segundos
    const keepAliveInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('user-activity')
      }
    }, 30000)

    // Cleanup
    return () => {
      clearInterval(keepAliveInterval)
      if (socket) {
        socket.disconnect()
      }
    }
  }, [options.userId])

  const joinConversation = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', conversationId)
      console.log('🚪 Entrou na conversa:', conversationId)
    }
  }

  const leaveConversation = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_conversation', conversationId)
      console.log('🚪 Saiu da conversa:', conversationId)
    }
  }

  const startTyping = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', { conversationId })
    }
  }

  const stopTyping = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', { conversationId })
    }
  }

  const emitEvent = (eventName: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventName, data)
    }
  }

  const markRead = (conversationId: string, userId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_read', { conversationId, userId })
    }
  }

  const sendReaction = (conversationId: string, messageId: string, emoji: string, userId: string, action: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message_reaction', { conversationId, messageId, emoji, userId, action })
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    emitEvent,
    markRead,
    sendReaction
  }
}
