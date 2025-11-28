// models/Group.ts - VERSÃO COMPLETA

export interface GroupDocument {
  _id?: string
  name: string
  description?: string
  avatar?: string
  
  // ==========================================
  // HIERARQUIA DE MEMBROS E ADMINS
  // ==========================================
  createdBy: string // SUPER ADMIN (criador - não pode ser removido NUNCA)
  
  members: Array<{
    userId: string
    role: 'super_admin' | 'admin' | 'member' // 3 níveis de permissão
    joinedAt: Date
    addedBy?: string // userId de quem adicionou esse membro
    joinMethod?: 'created' | 'added' | 'link' // Como esse membro entrou no grupo
    lastReadAt?: Date // Última vez que leu mensagens
    messageCount?: number // Quantas mensagens esse user enviou
  }>
  
  // ==========================================
  // USUÁRIOS BANIDOS
  // ==========================================
  bannedUsers?: Array<{
    userId: string
    bannedBy: string
    bannedAt: Date
    reason?: string
  }>
  
  // ==========================================
  // CONFIGURAÇÕES DO GRUPO
  // ==========================================
  settings: {
    onlyAdminsCanSend: boolean // Se true, só admins podem enviar mensagens
    onlyAdminsCanEditInfo: boolean // Se true, só admins podem mudar nome/foto/descrição
    allowMembersToAddOthers: boolean // Se true, membros podem adicionar outros membros
    maxMembers: number // Limite máximo de membros (padrão: 256, máximo: 1024)
  }
  
  // ==========================================
  // LINK DE CONVITE DO GRUPO
  // ==========================================
  inviteLink?: {
    code: string // Código único (ex: "abc123xyz789")
    enabled: boolean // Link está ativo ou desativado
    expiresAt?: Date // Data de expiração (opcional)
    maxUses?: number // Limite de usos (null = ilimitado)
    usedCount: number // Quantas vezes foi usado
    usedBy?: string[] // Array de userIds que usaram
    createdBy: string // userId do admin que criou o link
    createdAt: Date
  }
  
  // ==========================================
  // ESTATÍSTICAS DO GRUPO
  // ==========================================
  stats: {
    totalMessages: number // Total de mensagens enviadas
    totalMembers: number // Total de membros atuais
    messagesLast24h: number // Mensagens nas últimas 24h
    lastActivityAt?: Date // Última mensagem enviada
  }
  
  createdAt: Date
  updatedAt: Date
}

export interface GroupMessageDocument {
  _id?: string
  groupId: string // ID do grupo
  sender: string // userId de quem enviou (ou 'system' para msgs automáticas)
  content: string // Conteúdo da mensagem
  
  // ==========================================
  // TIPOS DE MENSAGEM
  // ==========================================
  type: 'text' | 'image' | 'audio' | 'system'
  
  // ==========================================
  // EVENTOS DO SISTEMA (quando type === 'system')
  // ==========================================
  systemEvent?: {
    type: 
      // Eventos de membros
      | 'user_added'           // "João adicionou Maria"
      | 'user_removed'         // "João removeu Pedro"
      | 'user_left'            // "Pedro saiu"
      | 'user_joined_via_link' // "Ana entrou usando o link deste grupo"
      | 'user_banned'          // "João baniu Carlos"
      | 'user_unbanned'        // "João desbaniu Carlos"
      
      // Eventos de promoção/remoção de admin
      | 'user_promoted'        // "João promoveu Maria a administrador"
      | 'user_demoted'         // "João removeu Maria dos administradores"
      
      // Eventos de criação do grupo
      | 'group_created'        // "João criou o grupo"
      
      // Eventos de alteração de informações
      | 'name_changed'         // "João alterou o nome do grupo"
      | 'description_changed'  // "João alterou a descrição"
      | 'avatar_changed'       // "João alterou a foto do grupo"
      | 'avatar_removed'       // "João removeu a foto do grupo"
      
      // Eventos de link de convite
      | 'invite_link_created'  // "João criou um link de convite"
      | 'invite_link_revoked'  // "João revogou o link de convite"
      
      // Eventos de configurações
      | 'settings_changed'     // "João alterou as configurações do grupo"
      | 'member_limit_changed' // "João alterou o limite de membros"
      | 'permissions_changed'  // "João alterou as permissões"
    
    // DADOS DO EVENTO
    actor: string // userId de quem realizou a ação
    target?: string // userId de quem sofreu a ação (se aplicável)
    oldValue?: string // Valor antigo (para mudanças de nome, descrição, etc)
    newValue?: string // Novo valor
    metadata?: Record<string, any> // Dados extras se necessário
  }
  
  // ==========================================
  // MÍDIAS (quando type === 'image' ou 'audio')
  // ==========================================
  image?: string // URL da imagem
  audioUrl?: string // URL do áudio
  
  // ==========================================
  // INTERAÇÕES COM A MENSAGEM
  // ==========================================
  readBy: string[] // Array de userIds que leram a mensagem
  
  reactions?: Array<{
    userId: string
    emoji: string // '👍', '❤️', '😂', etc
    createdAt: Date
  }>
  
  // ==========================================
  // RESPONDER MENSAGEM (Quote/Reply)
  // ==========================================
  replyTo?: string // messageId da mensagem que está sendo respondida
  
  // ==========================================
  // MENSAGEM DELETADA
  // ==========================================
  deleted?: boolean // Se true, mensagem foi deletada
  deletedAt?: Date
  deletedBy?: string // userId de quem deletou
  
  createdAt: Date
}
