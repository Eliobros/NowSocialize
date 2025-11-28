// utils/groupHelpers.ts

import { GroupDocument, GroupMessageDocument } from '@/models/Group'

// ==========================================
// VERIFICAR SE USUÁRIO ESTÁ BANIDO
// ==========================================
export function isUserBanned(userId: string, group: GroupDocument): boolean {
  return group.bannedUsers?.some(b => b.userId === userId) || false
}

// ==========================================
// VERIFICAR SE PODE REMOVER UM MEMBRO
// ==========================================
export function canRemoveMember(
  removerId: string, 
  targetId: string, 
  group: GroupDocument
): { allowed: boolean; reason?: string } {
  
  const remover = group.members.find(m => m.userId === removerId)
  const target = group.members.find(m => m.userId === targetId)
  
  // Super admin (criador) não pode ser removido
  if (target?.role === 'super_admin') {
    return { 
      allowed: false, 
      reason: 'Você não pode remover esse membro porque ele é o criador do grupo (Super Admin)' 
    }
  }
  
  // Apenas admins podem remover membros
  if (remover?.role === 'member') {
    return { 
      allowed: false, 
      reason: 'Apenas administradores podem remover membros' 
    }
  }
  
  // Admin comum não pode remover outro admin (só super admin pode)
  if (remover?.role === 'admin' && target?.role === 'admin') {
    return { 
      allowed: false, 
      reason: 'Apenas o criador do grupo pode remover outros administradores' 
    }
  }
  
  return { allowed: true }
}

// ==========================================
// VERIFICAR SE PODE PROMOVER/REBAIXAR ADMIN
// ==========================================
export function canChangeRole(
  actorId: string,
  targetId: string,
  group: GroupDocument
): { allowed: boolean; reason?: string } {
  
  const actor = group.members.find(m => m.userId === actorId)
  const target = group.members.find(m => m.userId === targetId)
  
  // Apenas super admin pode promover/rebaixar
  if (actor?.role !== 'super_admin') {
    return {
      allowed: false,
      reason: 'Apenas o criador do grupo pode alterar administradores'
    }
  }
  
  // Não pode mudar role do super admin
  if (target?.role === 'super_admin') {
    return {
      allowed: false,
      reason: 'Não é possível alterar o cargo do criador do grupo'
    }
  }
  
  return { allowed: true }
}

// ==========================================
// VERIFICAR SE PODE BANIR
// ==========================================
export function canBanUser(
  actorId: string,
  targetId: string,
  group: GroupDocument
): { allowed: boolean; reason?: string } {
  
  const actor = group.members.find(m => m.userId === actorId)
  const target = group.members.find(m => m.userId === targetId)
  
  // Apenas admins podem banir
  if (actor?.role === 'member') {
    return {
      allowed: false,
      reason: 'Apenas administradores podem banir membros'
    }
  }
  
  // Não pode banir super admin
  if (target?.role === 'super_admin') {
    return {
      allowed: false,
      reason: 'Não é possível banir o criador do grupo'
    }
  }
  
  // Admin comum não pode banir outro admin
  if (actor?.role === 'admin' && target?.role === 'admin') {
    return {
      allowed: false,
      reason: 'Apenas o criador pode banir outros administradores'
    }
  }
  
  return { allowed: true }
}

// ==========================================
// VERIFICAR SE PODE EDITAR INFO DO GRUPO
// ==========================================
export function canEditGroupInfo(
  userId: string,
  group: GroupDocument
): { allowed: boolean; reason?: string } {
  
  const member = group.members.find(m => m.userId === userId)
  
  if (!member) {
    return { allowed: false, reason: 'Você não é membro deste grupo' }
  }
  
  // Se settings.onlyAdminsCanEditInfo = true
  if (group.settings.onlyAdminsCanEditInfo) {
    if (member.role === 'member') {
      return { 
        allowed: false, 
        reason: 'Apenas administradores podem editar informações do grupo' 
      }
    }
  }
  
  return { allowed: true }
}

// ==========================================
// VERIFICAR SE PODE ENVIAR MENSAGENS
// ==========================================
export function canSendMessage(
  userId: string,
  group: GroupDocument
): { allowed: boolean; reason?: string } {
  
  const member = group.members.find(m => m.userId === userId)
  
  if (!member) {
    return { allowed: false, reason: 'Você não é membro deste grupo' }
  }
  
  // Verificar se está banido
  if (isUserBanned(userId, group)) {
    return { allowed: false, reason: 'Você foi banido deste grupo' }
  }
  
  // Se settings.onlyAdminsCanSend = true
  if (group.settings.onlyAdminsCanSend) {
    if (member.role === 'member') {
      return { 
        allowed: false, 
        reason: 'Apenas administradores podem enviar mensagens neste grupo' 
      }
    }
  }
  
  return { allowed: true }
}

// ==========================================
// VERIFICAR SE PODE ADICIONAR MEMBROS
// ==========================================
export function canAddMembers(
  userId: string,
  group: GroupDocument
): { allowed: boolean; reason?: string } {
  
  const member = group.members.find(m => m.userId === userId)
  
  if (!member) {
    return { allowed: false, reason: 'Você não é membro deste grupo' }
  }
  
  // Se allowMembersToAddOthers = true, qualquer membro pode adicionar
  if (group.settings.allowMembersToAddOthers) {
    return { allowed: true }
  }
  
  // Senão, apenas admins
  if (member.role === 'member') {
    return { 
      allowed: false, 
      reason: 'Apenas administradores podem adicionar membros' 
    }
  }
  
  return { allowed: true }
}

// ==========================================
// VERIFICAR SE GRUPO ATINGIU LIMITE DE MEMBROS
// ==========================================
export function isGroupFull(group: GroupDocument): boolean {
  return group.members.length >= group.settings.maxMembers
}

// ==========================================
// EXIBIR NOME COM BADGE DE ADMIN
// ==========================================
export function getMemberDisplayName(
  memberName: string,
  role: 'super_admin' | 'admin' | 'member'
): string {
  
  if (role === 'super_admin') {
    return `${memberName} (Criador)`
  }
  
  if (role === 'admin') {
    return `${memberName} (Administrador)`
  }
  
  return memberName
}

// ==========================================
// GERAR TEXTO DA MENSAGEM DO SISTEMA
// ==========================================
export function generateSystemMessage(
  systemEvent: GroupMessageDocument['systemEvent'],
  userNames: Record<string, string> // Map de userId -> nome
): string {
  
  if (!systemEvent) return 'Evento do sistema'
  
  const actorName = userNames[systemEvent.actor] || 'Alguém'
  const targetName = systemEvent.target ? userNames[systemEvent.target] || 'Alguém' : ''
  
  switch (systemEvent.type) {
    case 'user_added':
      return `${actorName} adicionou ${targetName}`
    
    case 'user_removed':
      return `${actorName} removeu ${targetName}`
    
    case 'user_left':
      return `${actorName} saiu`
    
    case 'user_joined_via_link':
      return `${actorName} entrou usando o link deste grupo`
    
    case 'user_banned':
      return `${actorName} baniu ${targetName}`
    
    case 'user_unbanned':
      return `${actorName} desbaniu ${targetName}`
    
    case 'user_promoted':
      return `${actorName} promoveu ${targetName} a administrador`
    
    case 'user_demoted':
      return `${actorName} removeu ${targetName} dos administradores`
    
    case 'group_created':
      return `${actorName} criou o grupo`
    
    case 'name_changed':
      return `${actorName} alterou o nome do grupo de "${systemEvent.oldValue}" para "${systemEvent.newValue}"`
    
    case 'description_changed':
      return `${actorName} alterou a descrição do grupo`
    
    case 'avatar_changed':
      return `${actorName} alterou a foto do grupo`
    
    case 'avatar_removed':
      return `${actorName} removeu a foto do grupo`
    
    case 'invite_link_created':
      return `${actorName} criou um link de convite`
    
    case 'invite_link_revoked':
      return `${actorName} revogou o link de convite`
    
    case 'settings_changed':
      return `${actorName} alterou as configurações do grupo`
    
    case 'member_limit_changed':
      return `${actorName} alterou o limite de membros para ${systemEvent.newValue}`
    
    case 'permissions_changed':
      return `${actorName} alterou as permissões do grupo`
    
    default:
      return 'Evento do sistema'
  }
}

// ==========================================
// GERAR CÓDIGO ÚNICO PARA LINK DE CONVITE
// ==========================================
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ==========================================
// VERIFICAR SE LINK DE CONVITE É VÁLIDO
// ==========================================
export function isInviteLinkValid(group: GroupDocument): { valid: boolean; reason?: string } {
  if (!group.inviteLink) {
    return { valid: false, reason: 'Grupo não possui link de convite' }
  }
  
  if (!group.inviteLink.enabled) {
    return { valid: false, reason: 'Link de convite desativado' }
  }
  
  // Verificar expiração
  if (group.inviteLink.expiresAt && new Date() > group.inviteLink.expiresAt) {
    return { valid: false, reason: 'Link de convite expirado' }
  }
  
  // Verificar limite de usos
  if (group.inviteLink.maxUses && group.inviteLink.usedCount >= group.inviteLink.maxUses) {
    return { valid: false, reason: 'Link de convite atingiu o limite de usos' }
  }
  
  // Verificar se grupo está cheio
  if (isGroupFull(group)) {
    return { valid: false, reason: 'Grupo atingiu o limite máximo de membros' }
  }
  
  return { valid: true }
}
