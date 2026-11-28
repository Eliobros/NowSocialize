// Chat da live: histórico + mensagens em tempo real via socket.
"use client"

import { useEffect, useRef, useState } from "react"
import { Send, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LiveChatMessage } from "@/components/live/types"

interface LiveChatProps {
  messages: LiveChatMessage[]
  currentUserId: string
  streamerId: string
  canSend: boolean
  sendHint: string
  onSend: (text: string) => void
}

export function LiveChat({ messages, currentUserId, streamerId, canSend, sendHint, onSend }: LiveChatProps) {
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = () => {
    const text = draft.trim()
    if (!text || !canSend) return
    onSend(text.slice(0, 500))
    setDraft("")
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MessageCircle className="h-4 w-4" />
        <p className="text-sm font-semibold">Chat ao vivo</p>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ainda não há mensagens. Sê o primeiro a dizer olá!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={msg.avatar || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(msg.username || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs">
                    <span
                      className={
                        msg.userId === streamerId
                          ? "font-semibold text-red-500"
                          : msg.userId === currentUserId
                            ? "font-semibold text-sky-500"
                            : "font-semibold text-muted-foreground"
                      }
                    >
                      {msg.username}
                      {msg.userId === streamerId ? " (streamer)" : ""}
                    </span>{" "}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                  <p className="break-words text-sm">{msg.message}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            placeholder={canSend ? "Escreve uma mensagem…" : sendHint}
            value={draft}
            disabled={!canSend}
            maxLength={500}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend()
            }}
          />
          <Button size="icon" disabled={!canSend || !draft.trim()} onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!canSend && (
          <p className="mt-2 text-xs text-muted-foreground">{sendHint}</p>
        )}
      </div>
    </div>
  )
}
