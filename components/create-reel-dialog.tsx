"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { VideoIcon, X, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// TROCA AQUI pelo teu cloud name do Cloudinary (Dashboard -> Settings -> Account)
const CLOUDINARY_CLOUD_NAME = "dfgwgf8su"
const CLOUDINARY_UPLOAD_PRESET = "socializenow"

interface CreateReelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReelCreated: () => void
}

export function CreateReelDialog({ open, onOpenChange, onReelCreated }: CreateReelDialogProps) {
  const [content, setContent] = useState("")
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number>(0)
  const [creating, setCreating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      setError("Por favor, selecione apenas arquivos de vídeo")
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      setError("O vídeo deve ter no máximo 100MB")
      return
    }

    const videoURL = URL.createObjectURL(file)
    setSelectedVideo(file)
    setVideoPreview(videoURL)
    setError("")
  }

  useEffect(() => {
    if (videoPreview && videoRef.current) {
      videoRef.current.src = videoPreview
      videoRef.current.load()
      videoRef.current.onloadedmetadata = () => {
        const duration = videoRef.current?.duration || 0
        setVideoDuration(duration)

        if (duration > 90) {
          setError("O vídeo não pode ter mais de 1 minuto e 30 segundos.")
          setSelectedVideo(null)
          setVideoPreview(null)
          setVideoDuration(0)
          if (fileInputRef.current) fileInputRef.current.value = ""
        }
      }
    }
  }, [videoPreview])

  const removeVideo = () => {
    setSelectedVideo(null)
    setVideoPreview(null)
    setVideoDuration(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Faz upload do vídeo DIRETO para o Cloudinary, sem passar pelo backend.
  // Isso evita o limite de 4.5MB de body das serverless functions do Vercel.
  const uploadVideoToCloudinary = (file: File): Promise<{ videoUrl: string; publicId: string }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
      formData.append("folder", "reels")
      formData.append("resource_type", "video")

      const xhr = new XMLHttpRequest()
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText)
          resolve({ videoUrl: data.secure_url, publicId: data.public_id })
        } else {
          reject(new Error("Falha no upload do vídeo para o Cloudinary"))
        }
      }

      xhr.onerror = () => reject(new Error("Erro de conexão durante o upload do vídeo"))
      xhr.send(formData)
    })
  }

  const handleCreateReel = async () => {
    if (!selectedVideo || videoDuration === 0 || videoDuration > 90) {
      setError("Selecione um vídeo válido para o reel (máx. 1m 30s).")
      return
    }

    setCreating(true)
    setError("")
    setUploadProgress(0)

    try {
      const token = localStorage.getItem("token")

      // 1. Upload direto para o Cloudinary (arquivo pesado)
      const { videoUrl, publicId } = await uploadVideoToCloudinary(selectedVideo)

      // 2. Envia só os dados leves (texto) para a nossa API salvar no banco
      const response = await fetch("/api/reels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          videoUrl,
          publicId,
          duration: videoDuration,
        }),
      })

      if (response.ok) {
        setContent("")
        removeVideo()
        onOpenChange(false)
        onReelCreated()
        toast({
          title: "Sucesso!",
          description: "Seu reel foi publicado.",
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Erro ao criar reel")
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao criar reel.",
          variant: "destructive",
        })
      }
    } catch (error) {
      setError("Erro de conexão")
      toast({
        title: "Erro",
        description: "Erro de conexão ao criar reel.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
      setUploadProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Reel</DialogTitle>
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

          {videoPreview ? (
            <div className="relative">
              <video
                ref={videoRef}
                controls
                className="w-full max-h-64 object-contain rounded-lg bg-black"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeVideo}
              >
                <X className="h-4 w-4" />
              </Button>
              {videoDuration > 0 && <p className="text-xs text-gray-500 mt-1">Duração: {videoDuration.toFixed(1)}s</p>}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <VideoIcon className="h-5 w-5" />
                Selecionar Vídeo
              </Button>
              <p className="text-sm text-gray-500 mt-2">Selecione um vídeo para seu reel (máx. 1m 30s, 100MB)</p>
            </div>
          )}

          {creating && uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleCreateReel}
              disabled={creating || !selectedVideo || videoDuration === 0 || videoDuration > 90}
              className="flex-1"
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {creating ? (uploadProgress > 0 ? `Enviando ${uploadProgress}%` : "Publicando...") : "Publicar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
