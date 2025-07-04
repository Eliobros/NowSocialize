"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImageIcon, X, Loader2 } from "lucide-react"

interface CreateStoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStoryCreated: () => void
}

export function CreateStoryDialog({ open, onOpenChange, onStoryCreated }: CreateStoryDialogProps) {
  const [content, setContent] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione apenas arquivos de imagem")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 10MB")
      return
    }

    setSelectedImage(file)
    setError("")

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

  const handleCreateStory = async () => {
    if (!selectedImage) {
      setError("Selecione uma imagem para o story")
      return
    }

    setCreating(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      formData.append("content", content)
      formData.append("image", selectedImage)

      const response = await fetch("/api/stories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        setContent("")
        removeImage()
        onOpenChange(false)
        onStoryCreated()
      } else {
        setError("Erro ao criar story")
      }
    } catch (error) {
      setError("Erro de conexão")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}

          <Textarea
            placeholder="Adicione uma legenda (opcional)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview || "/placeholder.svg"}
                alt="Preview"
                className="w-full max-h-64 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <ImageIcon className="h-5 w-5" />
                Selecionar Imagem
              </Button>
              <p className="text-sm text-gray-500 mt-2">Selecione uma imagem para seu story</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleCreateStory} disabled={creating || !selectedImage} className="flex-1">
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
