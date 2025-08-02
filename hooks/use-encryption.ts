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

  // Gerar chaves de criptografia no cliente
  const generateKeys = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return false

      // Gerar chaves no cliente
      const keyPair = await EndToEndEncryption.generateKeyPair()

      // Armazenar no servidor
      const response = await fetch("/api/encryption-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "store_keys",
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey,
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

      // Obter chave pública do destinatário
      const token = localStorage.getItem("token")
      if (!token) return null

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
        console.error("Erro ao obter chave pública do destinatário")
        return null
      }

      const { publicKey } = await response.json()

      // Criptografar chave de conversa com chave pública do destinatário
      const encryptedConversationKey = await EndToEndEncryption.encryptConversationKey(
        conversationKey,
        publicKey
      )

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
      // Obter chave privada do usuário
      const token = localStorage.getItem("token")
      if (!token) return null

      const response = await fetch("/api/encryption-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "get_private_key",
        }),
      })

      if (!response.ok) {
        console.error("Erro ao obter chave privada")
        return null
      }

      const { privateKey } = await response.json()

      // Descriptografar chave de conversa com chave privada
      const conversationKey = await EndToEndEncryption.decryptConversationKey(
        encryptedMessage.encryptedConversationKey,
        privateKey
      )

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