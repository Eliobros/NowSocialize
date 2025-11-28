"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Mic, Send, X, Loader2, Smile, ImageIcon } from "lucide-react"

interface MessageInputProps {
  onSendMessage: (content: string, image?: File) => Promise<boolean>
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = "Digite sua mensagem..."
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const success = await onSendMessage(message, selectedImage || undefined)
      if (success) {
        setMessage("")
        removeImage()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t bg-white p-4 flex-shrink-0">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-20 rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 p-0"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Image button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="p-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Camera className="h-5 w-5 text-gray-500" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            className="pr-10"
            disabled={disabled || sending}
          />
          <Smile className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>

        {/* Send button */}
        <Button
          type="submit"
          disabled={sending || disabled || (!message.trim() && !selectedImage)}
          className="rounded-full w-10 h-10 p-0 bg-blue-500 hover:bg-blue-600"
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
