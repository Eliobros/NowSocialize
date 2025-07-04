"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff } from "lucide-react"

interface IncomingCallProps {
  callerName: string
  onAccept: () => void
  onReject: () => void
}

export function IncomingCall({ callerName, onAccept, onReject }: IncomingCallProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="mb-6">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarFallback className="bg-blue-600 text-white text-2xl">{getInitials(callerName)}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-semibold mb-2">{callerName}</h2>
          <p className="text-gray-600 dark:text-gray-400">Chamada recebida...</p>
        </div>

        <div className="flex justify-center gap-8">
          <Button onClick={onReject} variant="destructive" size="lg" className="rounded-full h-16 w-16 p-0">
            <PhoneOff className="h-8 w-8" />
          </Button>
          <Button onClick={onAccept} className="rounded-full h-16 w-16 p-0 bg-green-500 hover:bg-green-600">
            <Phone className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  )
}
