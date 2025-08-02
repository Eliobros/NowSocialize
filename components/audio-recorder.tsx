"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Pause, Play, Trash2, Send } from "lucide-react"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"

interface AudioRecorderProps {
  conversationId: string
  onAudioSent: (audioUrl: string) => void
  onCancel: () => void
}

export function AudioRecorder({ conversationId, onAudioSent, onCancel }: AudioRecorderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadAudio,
    resetRecording,
  } = useAudioRecorder()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartRecording = async () => {
    try {
      await startRecording()
    } catch (error) {
      alert("Erro ao acessar microfone. Verifique as permissões.")
    }
  }

  const handleSendAudio = async () => {
    if (!audioBlob) return

    setIsUploading(true)
    try {
      const audioUrl = await uploadAudio(conversationId)
      if (audioUrl) {
        onAudioSent(audioUrl)
        resetRecording()
      }
    } catch (error) {
      alert("Erro ao enviar áudio. Tente novamente.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    resetRecording()
    onCancel()
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      {!isRecording && !audioBlob ? (
        // Initial state - start recording
        <Button
          onClick={handleStartRecording}
          size="sm"
          className="bg-red-500 hover:bg-red-600"
        >
          <Mic className="h-4 w-4" />
        </Button>
      ) : isRecording ? (
        // Recording state
        <>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
          </div>
          
          <Button
            onClick={isPaused ? resumeRecording : pauseRecording}
            size="sm"
            variant="outline"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          
          <Button
            onClick={stopRecording}
            size="sm"
            variant="outline"
          >
            <Square className="h-4 w-4" />
          </Button>
        </>
      ) : (
        // Audio recorded - send or cancel
        <>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
          </div>
          
          <Button
            onClick={handleSendAudio}
            size="sm"
            disabled={isUploading}
            className="bg-green-500 hover:bg-green-600"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            onClick={handleCancel}
            size="sm"
            variant="outline"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}