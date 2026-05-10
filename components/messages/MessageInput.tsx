"use client"

import React, { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Send, X, Loader2, Smile } from "lucide-react"

interface MessageInputProps {
  onSendMessage: (content: string, image?: File, targetLang?: string) => Promise<boolean>
  preferredLanguage?: string
  disabled?: boolean
  placeholder?: string
  replyingTo?: {
    _id: string
    content: string
    sender: { _id: string; name: string }
  } | null
  onCancelReply?: () => void
  onTypingStart?: () => void
  onTypingStop?: () => void
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = "Digite sua mensagem...",
  replyingTo,
  onCancelReply,
  onTypingStart,
  onTypingStop,
  preferredLanguage = ""
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      onTypingStart?.()
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      onTypingStop?.()
    }, 2000)
  }, [onTypingStart, onTypingStop])

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    if (e.target.value.trim()) {
      handleTyping()
    } else if (isTypingRef.current) {
      isTypingRef.current = false
      onTypingStop?.()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas imagens")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 10MB")
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && !selectedImage) || sending || disabled) return

    setSending(true)
    try {
      const success = await onSendMessage(message, selectedImage || undefined, preferredLanguage)
      if (success) {
        setMessage("")
        removeImage()
        if (isTypingRef.current) {
          isTypingRef.current = false
          onTypingStop?.()
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-border bg-card px-3 py-2.5 flex-shrink-0 relative z-10">
      {imagePreview && (
        <div className="mb-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-20 rounded-lg border border-border"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border-l-2 border-primary">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">{replyingTo.sender.name}</p>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full flex-shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-full flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Camera className="h-5 w-5" />
        </Button>

        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={handleMessageChange}
            placeholder={placeholder}
            className="pr-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
            disabled={disabled || sending}
          />
          <Smile className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <Button
          type="submit"
          disabled={sending || disabled || (!message.trim() && !selectedImage)}
          size="sm"
          className="rounded-full h-9 w-9 p-0 flex-shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
