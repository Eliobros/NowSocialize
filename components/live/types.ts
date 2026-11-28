export type LiveStatus = "waiting" | "live" | "ended"

export interface LiveInfo {
  id: string
  streamerId: string
  streamerName: string
  streamerAvatar?: string | null
  title: string
  description?: string
  status: LiveStatus
  viewersCount: number
  maxViewers: number
  createdAt: string
  startedAt?: string | null
  endedAt?: string | null
}

export interface LiveChatMessage {
  id: string
  userId: string
  username: string
  avatar?: string | null
  message: string
  createdAt: string
}
