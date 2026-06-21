// Criptografia ponta a ponta usando Web Crypto API
export class EndToEndEncryption {
  private static readonly ALGORITHM = "AES-GCM"
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12

  // Verificar se estamos no navegador
  private static isBrowser(): boolean {
    return typeof window !== "undefined" && typeof window.crypto !== "undefined"
  }

  // Obter crypto API (browser ou Node.js)
  private static getCrypto(): Crypto {
    if (this.isBrowser()) {
      return window.crypto
    } else {
      // Para Node.js, usar crypto nativo
      const crypto = require("crypto")
      return crypto.webcrypto || crypto
    }
  }

  // Gerar par de chaves para um usuário
  static async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    if (!this.isBrowser()) {
      throw new Error("Geração de chaves só é suportada no navegador por questões de segurança")
    }

    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    )

    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey)
    const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)

    return {
      publicKey: this.arrayBufferToBase64(publicKeyBuffer),
      privateKey: this.arrayBufferToBase64(privateKeyBuffer),
    }
  }

  // Gerar chave simétrica para uma conversa
  static async generateConversationKey(): Promise<string> {
    if (!this.isBrowser()) {
      throw new Error("Geração de chaves só é suportada no navegador por questões de segurança")
    }

    const key = await window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ["encrypt", "decrypt"]
    )

    const exportedKey = await window.crypto.subtle.exportKey("raw", key)
    return this.arrayBufferToBase64(exportedKey)
  }

  // Criptografar mensagem
  static async encryptMessage(message: string, conversationKey: string): Promise<string> {
    if (!this.isBrowser()) {
      throw new Error("Criptografia só é suportada no navegador por questões de segurança")
    }

    const keyBuffer = this.base64ToArrayBuffer(conversationKey)
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: this.ALGORITHM },
      false,
      ["encrypt"]
    )

    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
    const encodedMessage = new TextEncoder().encode(message)

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv,
      },
      key,
      encodedMessage
    )

    // Combinar IV e dados criptografados
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedData), iv.length)

    return this.arrayBufferToBase64(combined)
  }

  // Descriptografar mensagem
  static async decryptMessage(encryptedMessage: string, conversationKey: string): Promise<string> {
    if (!this.isBrowser()) {
      throw new Error("Descriptografia só é suportada no navegador por questões de segurança")
    }

    const keyBuffer = this.base64ToArrayBuffer(conversationKey)
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: this.ALGORITHM },
      false,
      ["decrypt"]
    )

    const combined = this.base64ToArrayBuffer(encryptedMessage)
    const iv = combined.slice(0, this.IV_LENGTH)
    const encryptedData = combined.slice(this.IV_LENGTH)

    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv,
      },
      key,
      encryptedData
    )

    return new TextDecoder().decode(decryptedData)
  }

  // Criptografar chave de conversa com chave pública do destinatário
  static async encryptConversationKey(
    conversationKey: string,
    recipientPublicKey: string
  ): Promise<string> {
    if (!this.isBrowser()) {
      throw new Error("Criptografia só é suportada no navegador por questões de segurança")
    }

    const publicKeyBuffer = this.base64ToArrayBuffer(recipientPublicKey)
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    )

    const conversationKeyBuffer = this.base64ToArrayBuffer(conversationKey)
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      conversationKeyBuffer
    )

    return this.arrayBufferToBase64(encryptedKey)
  }

  // Descriptografar chave de conversa com chave privada
  static async decryptConversationKey(
    encryptedConversationKey: string,
    privateKey: string
  ): Promise<string> {
    if (!this.isBrowser()) {
      throw new Error("Descriptografia só é suportada no navegador por questões de segurança")
    }

    const privateKeyBuffer = this.base64ToArrayBuffer(privateKey)
    const key = await window.crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["decrypt"]
    )

    const encryptedKeyBuffer = this.base64ToArrayBuffer(encryptedConversationKey)
    const decryptedKey = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      key,
      encryptedKeyBuffer
    )

    return this.arrayBufferToBase64(decryptedKey)
  }

  // Utilitários para conversão
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}

// Gerenciador de chaves para conversas
export class ConversationKeyManager {
  private static instance: ConversationKeyManager
  private conversationKeys: Map<string, string> = new Map()

  static getInstance(): ConversationKeyManager {
    if (!ConversationKeyManager.instance) {
      ConversationKeyManager.instance = new ConversationKeyManager()
    }
    return ConversationKeyManager.instance
  }

  // Gerar nova chave para conversa
  async generateConversationKey(conversationId: string): Promise<string> {
    const key = await EndToEndEncryption.generateConversationKey()
    this.conversationKeys.set(conversationId, key)
    return key
  }

  // Obter chave de conversa
  getConversationKey(conversationId: string): string | undefined {
    return this.conversationKeys.get(conversationId)
  }

  // Definir chave de conversa
  setConversationKey(conversationId: string, key: string): void {
    this.conversationKeys.set(conversationId, key)
  }

  // Remover chave de conversa
  removeConversationKey(conversationId: string): void {
    this.conversationKeys.delete(conversationId)
  }

  // Limpar todas as chaves
  clearAllKeys(): void {
    this.conversationKeys.clear()
  }
}

// Armazenamento LOCAL da chave privada — NUNCA sai do dispositivo.
// Usa IndexedDB porque localStorage tem limite de tamanho e é mais fácil
// de exportar/copiar acidentalmente. A chave privada não pode, em nenhuma
// circunstância, ser enviada para o servidor.
export class PrivateKeyStorage {
  private static readonly DB_NAME = "socializenow_e2e"
  private static readonly STORE_NAME = "private_keys"
  private static readonly DB_VERSION = 1

  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB não disponível"))
        return
      }

      const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME)
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Guarda a chave privada localmente, associada ao userId
  // (assim, se houver troca de conta no mesmo navegador, não há mistura de chaves)
  static async savePrivateKey(userId: string, privateKey: string): Promise<void> {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, "readwrite")
      tx.objectStore(this.STORE_NAME).put(privateKey, userId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  static async getPrivateKey(userId: string): Promise<string | null> {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, "readonly")
      const request = tx.objectStore(this.STORE_NAME).get(userId)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  }

  static async hasPrivateKey(userId: string): Promise<boolean> {
    const key = await this.getPrivateKey(userId).catch(() => null)
    return key !== null
  }

  // Usado no logout — a chave privada não deve persistir além da sessão
  // se o utilizador pedir para "esquecer este dispositivo"
  static async removePrivateKey(userId: string): Promise<void> {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, "readwrite")
      tx.objectStore(this.STORE_NAME).delete(userId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

// Interface para mensagem criptografada
export interface EncryptedMessage {
  content: string // Conteúdo criptografado
  encryptedConversationKey: string // Chave de conversa criptografada
  iv: string // Vetor de inicialização
  signature?: string // Assinatura digital (opcional)
}

// Interface para configuração de criptografia
export interface EncryptionConfig {
  enabled: boolean
  keyRotationInterval?: number // em dias
  forwardSecrecy: boolean
}
