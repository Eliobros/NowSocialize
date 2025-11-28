// types/message.ts

export interface User {
  _id: string
  name: string
  username: string
  avatar: string
  lastSeen?: string
  isOnline?: boolean
}

export interface Message {
  _id: string
  content: string
  image?: string
  audioUrl?: string
  type?: 'text' | 'image' | 'audio'
  sender: {
    _id: string
    name: string
    avatar: string
  }
  receiver?: {
    _id: string
    name: string
    avatar: string
  }
  conversationId?: string
  groupId?: string
  createdAt: string
  read: boolean
  readBy?: string[] // Para mensagens de grupo
}

export interface Conversation {
  _id: string
  type: 'direct' | 'group'
  participants: Array<{
    _id: string
    name: string
    avatar: string
    lastSeen?: string
    isOnline?: boolean
  }>
  lastMessage: {
    content: string
    createdAt: string
    sender: string
  }
  unreadCount: number
}

// Novos tipos para grupos
export interface GroupMember {
  userId: string
  role: 'admin' | 'member'
  joinedAt: Date
}

export interface Group {
  _id: string
  name: string
  description?: string
  avatar?: string
  createdBy: string
  members: GroupMember[]
  admins: string[]
  createdAt: Date
  updatedAt: Date
}

export interface GroupConversation extends Conversation {
  type: 'group'
  groupInfo: {
    name: string
    description?: string
    avatar?: string
    admins: string[]
    memberCount: number
  }
}
