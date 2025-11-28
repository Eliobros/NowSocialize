// models/Conversation.ts

export interface ConversationDocument {
  _id?: string
  
  // ==========================================
  // TIPO DE CONVERSA
  // ==========================================
  type: 'direct' | 'group'
  
  // ==========================================
  // PARTICIPANTES (para conversas diretas)
  // ==========================================
  participants?: string[] // Array com 2 userIds (apenas para type: 'direct')
  
  // ==========================================
  // GRUPO (para conversas em grupo)
  // ==========================================
  groupId?: string // Referência ao ID do grupo (apenas para type: 'group')
  
  // ==========================================
  // ÚLTIMA MENSAGEM
  // ==========================================
  lastMessage: {
    content: string
    sender: string // userId ou 'system'
    type: 'text' | 'image' | 'audio' | 'system'
    createdAt: Date
  }
  
  // ==========================================
  // CONTADOR DE NÃO LIDAS POR USUÁRIO
  // ==========================================
  unreadCount: Record<string, number> // { 'userId1': 5, 'userId2': 0 }
  
  // ==========================================
  // CONVERSA SILENCIADA (por usuário)
  // ==========================================
  mutedBy?: string[] // Array de userIds que silenciaram essa conversa
  
  // ==========================================
  // CONVERSA FIXADA (por usuário)
  // ==========================================
  pinnedBy?: string[] // Array de userIds que fixaram essa conversa no topo
  
  // ==========================================
  // ARQUIVADA (por usuário)
  // ==========================================
  archivedBy?: string[] // Array de userIds que arquivaram essa conversa
  
  createdAt: Date
  updatedAt: Date
}
