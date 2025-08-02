"use client"

import { useState, useEffect, useCallback } from "react"
import { EndToEndEncryption, ConversationKeyManager, type EncryptedMessage } from "@/lib/encryption"

interface UseEncryptionReturn {
  isEncryptionEnabled: boolean
  hasKeys: boolean
  encryptMessage: (message: string, conversationId: string, recipientId: string) => Promise<EncryptedMessage | null>
  decryptMessage: (encryptedMessage: EncryptedMessage, conversationId: string) => Promise<string | null>
  generateKeys: () => Promise<boolean>
  setupConversation: (conversationId: string, recipientId: string) => Promise<boolean>
}

export function useEncryption(): UseEncryptionReturn {
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false)
  const [hasKeys, setHasKeys] = useState(false)
  const keyManager = ConversationKeyManager.getInstance()

  // Verificar se o usuário tem chaves de criptografia
  const checkEncryptionKeys = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch("/api/encryption-keys", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setHasKeys(data.hasKeys)
        setIsEncryptionEnabled(data.hasKeys)
      }
    } catch (error) {
      console.error("Erro ao verificar chaves de criptografia:", error)
    }
  }, [])

  // Gerar chaves de criptografia
  const generateKeys = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return false

      const response = await fetch("/api/encryption-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "generate_keys",
        }),
      })

      if (response.ok) {
        setHasKeys(true)
        setIsEncryptionEnabled(true)
        return true
      }
      return false
    } catch (error) {
      console.error("Erro ao gerar chaves de criptografia:", error)
      return false
    }
  }, [])

  // Configurar conversa com criptografia
  const setupConversation = useCallback(async (conversationId: string, recipientId: string): Promise<boolean> => {
    try {
      // Gerar chave de conversa se não existir
      let conversationKey = keyManager.getConversationKey(conversationId)
      if (!conversationKey) {
        conversationKey = await keyManager.generateConversationKey(conversationId)
      }

      const token = localStorage.getItem("token")
      if (!token) return false

      // Obter chave pública do destinatário
      const response = await fetch("/api/encryption-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "get_public_key",
          recipientId,
        }),
      })

      if (!response.ok) {
        console.error("Não foi possível obter chave pública do destinatário")
        return false
      }

      return true
    } catch (error) {
      console.error("Erro ao configurar conversa:", error)
      return false
    }
  }, [keyManager])

  // Criptografar mensagem
  const encryptMessage = useCallback(async (
    message: string,
    conversationId: string,
    recipientId: string
  ): Promise<EncryptedMessage | null> => {
    if (!isEncryptionEnabled) {
      return null
    }

    try {
      // Obter chave de conversa
      let conversationKey = keyManager.getConversationKey(conversationId)
      if (!conversationKey) {
        conversationKey = await keyManager.generateConversationKey(conversationId)
      }

      // Criptografar mensagem
      const encryptedContent = await EndToEndEncryption.encryptMessage(message, conversationKey)

      // Criptografar chave de conversa para o destinatário
      const token = localStorage.getItem("token")
      if (!token) return null

      const response = await fetch("/api/encryption-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "encrypt_conversation_key",
          recipientId,
          conversationKey,
        }),
      })

      if (!response.ok) {
        console.error("Erro ao criptografar chave de conversa")
        return null
      }

      const { encryptedConversationKey } = await response.json()

      return {
        content: encryptedContent,
        encryptedConversationKey,
        iv: "", // IV está incluído no conteúdo criptografado
      }
    } catch (error) {
      console.error("Erro ao criptografar mensagem:", error)
      return null
    }
  }, [isEncryptionEnabled, keyManager])

  // Descriptografar mensagem
  const decryptMessage = useCallback(async (
    encryptedMessage: EncryptedMessage,
    conversationId: string
  ): Promise<string | null> => {
    if (!isEncryptionEnabled) {
      return null
    }

    try {
      // Descriptografar chave de conversa
      const token = localStorage.getItem("token")
      if (!token) return null

      const response = await fetch("/api/encryption-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "decrypt_conversation_key",
          conversationKey: encryptedMessage.encryptedConversationKey,
        }),
      })

      if (!response.ok) {
        console.error("Erro ao descriptografar chave de conversa")
        return null
      }

      const { conversationKey } = await response.json()

      // Descriptografar mensagem
      const decryptedMessage = await EndToEndEncryption.decryptMessage(
        encryptedMessage.content,
        conversationKey
      )

      return decryptedMessage
    } catch (error) {
      console.error("Erro ao descriptografar mensagem:", error)
      return null
    }
  }, [isEncryptionEnabled])

  // Verificar chaves na inicialização
  useEffect(() => {
    checkEncryptionKeys()
  }, [checkEncryptionKeys])

  return {
    isEncryptionEnabled,
    hasKeys,
    encryptMessage,
    decryptMessage,
    generateKeys,
    setupConversation,
  }
}