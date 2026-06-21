"use client"

import { useState, useEffect, useCallback } from "react"
import { EndToEndEncryption, ConversationKeyManager, PrivateKeyStorage, type EncryptedMessage } from "@/lib/encryption"

interface UseEncryptionReturn {
  isEncryptionEnabled: boolean
  hasKeys: boolean
  encryptMessage: (message: string, conversationId: string, recipientId: string) => Promise<EncryptedMessage | null>
  decryptMessage: (encryptedMessage: EncryptedMessage, conversationId: string) => Promise<string | null>
  generateKeys: () => Promise<boolean>
  setupConversation: (conversationId: string, recipientId: string) => Promise<boolean>
}

// Helper para obter o userId a partir do token JWT (sem libs extra,
// só decodifica o payload — o token já foi validado pelo servidor antes)
function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.userId ?? null
  } catch {
    return null
  }
}

export function useEncryption(): UseEncryptionReturn {
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false)
  const [hasKeys, setHasKeys] = useState(false)
  const keyManager = ConversationKeyManager.getInstance()

  // Verificar se o usuário tem chaves de criptografia
  // (verifica tanto no servidor — chave pública publicada — quanto
  // localmente — chave privada presente neste dispositivo)
  const checkEncryptionKeys = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const userId = getUserIdFromToken(token)
      if (!userId) return

      const response = await fetch("/api/encryption-keys", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const hasLocalPrivateKey = await PrivateKeyStorage.hasPrivateKey(userId)

        // só consideramos "pronto" se existir chave pública no servidor
        // E chave privada neste dispositivo
        setHasKeys(data.hasKeys && hasLocalPrivateKey)
        setIsEncryptionEnabled(data.hasKeys && hasLocalPrivateKey)
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

      const userId = getUserIdFromToken(token)
      if (!userId) return false

      // Gerar chaves no cliente
      const keyPair = await EndToEndEncryption.generateKeyPair()

      // ⚠️ A chave privada NUNCA é enviada ao servidor — fica só neste dispositivo
      await PrivateKeyStorage.savePrivateKey(userId, keyPair.privateKey)

      // Apenas a chave pública é enviada e armazenada no servidor
      const response = await fetch("/api/encryption-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "store_keys",
          publicKey: keyPair.publicKey,
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
  // ⚠️ A chave privada é lida LOCALMENTE (IndexedDB) — nunca pedida ao servidor
  const decryptMessage = useCallback(async (
    encryptedMessage: EncryptedMessage,
    conversationId: string
  ): Promise<string | null> => {
    if (!isEncryptionEnabled) {
      return null
    }

    try {
      const token = localStorage.getItem("token")
      if (!token) return null

      const userId = getUserIdFromToken(token)
      if (!userId) return null

      // Obter chave privada do dispositivo local — NUNCA via API
      const privateKey = await PrivateKeyStorage.getPrivateKey(userId)
      if (!privateKey) {
        console.error("Chave privada não encontrada neste dispositivo. " +
          "As mensagens cifradas antes deste dispositivo ter sido configurado " +
          "não podem ser lidas aqui (isto é esperado em E2E).")
        return null
      }

      // Descriptografar chave de conversa com chave privada local
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
