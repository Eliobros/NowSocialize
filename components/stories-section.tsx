"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Eye, Heart, X } from "lucide-react"

interface Story {
  _id: string
  image: string
  content: string
  createdAt: string
  views: string[]
  likes: string[]
  viewedByUser: boolean
  likedByUser: boolean
}

interface UserStories {
  _id: string
  author: {
    _id: string
    name: string
    avatar?: string
  }
  stories: Story[]
  hasUnviewed: number
}

interface StoriesSectionProps {
  onCreateStory: () => void
}

export function StoriesSection({ onCreateStory }: StoriesSectionProps) {
  const [userStories, setUserStories] = useState<UserStories[]>([])
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<UserStories | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/stories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUserStories(data.stories)
      }
    } catch (error) {
      console.error("Erro ao carregar stories:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStoryClick = async (userStory: UserStories, storyIndex = 0) => {
    setSelectedStoryGroup(userStory)
    setCurrentStoryIndex(storyIndex)

    // Marcar como visualizado
    const story = userStory.stories[storyIndex]
    if (!story.viewedByUser) {
      try {
        const token = localStorage.getItem("token")
        await fetch(`/api/stories/${story._id}/view`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        fetchStories() // Atualizar lista
      } catch (error) {
        console.error("Erro ao marcar visualização:", error)
      }
    }
  }

  const handleLikeStory = async () => {
    if (!selectedStoryGroup) return

    const story = selectedStoryGroup.stories[currentStoryIndex]
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/stories/${story._id}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Atualizar estado local
        setSelectedStoryGroup((prev) => {
          if (!prev) return prev
          const updatedStories = [...prev.stories]
          updatedStories[currentStoryIndex] = {
            ...updatedStories[currentStoryIndex],
            likedByUser: data.liked,
            likes: Array(data.likes).fill(""),
          }
          return { ...prev, stories: updatedStories }
        })
      }
    } catch (error) {
      console.error("Erro ao curtir story:", error)
    }
  }

  const nextStory = () => {
    if (!selectedStoryGroup) return

    if (currentStoryIndex < selectedStoryGroup.stories.length - 1) {
      const newIndex = currentStoryIndex + 1
      setCurrentStoryIndex(newIndex)
      handleStoryClick(selectedStoryGroup, newIndex)
    } else {
      // Próximo usuário
      const currentUserIndex = userStories.findIndex((u) => u._id === selectedStoryGroup._id)
      if (currentUserIndex < userStories.length - 1) {
        const nextUser = userStories[currentUserIndex + 1]
        handleStoryClick(nextUser, 0)
      } else {
        setSelectedStoryGroup(null)
      }
    }
  }

  const prevStory = () => {
    if (!selectedStoryGroup) return

    if (currentStoryIndex > 0) {
      const newIndex = currentStoryIndex - 1
      setCurrentStoryIndex(newIndex)
      handleStoryClick(selectedStoryGroup, newIndex)
    } else {
      // Usuário anterior
      const currentUserIndex = userStories.findIndex((u) => u._id === selectedStoryGroup._id)
      if (currentUserIndex > 0) {
        const prevUser = userStories[currentUserIndex - 1]
        handleStoryClick(prevUser, prevUser.stories.length - 1)
      }
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Agora"
    if (diffInHours < 24) return `${diffInHours}h`
    return "1d"
  }

  if (loading) {
    return (
      <div className="px-4 py-3">
        <ScrollArea className="w-full">
          <div className="flex gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="w-12 h-3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <>
      <div className="px-4 py-3">
        <ScrollArea className="w-full">
          <div className="flex gap-4">
            {/* Criar Story */}
            <div className="flex flex-col items-center gap-2 min-w-[70px]">
              <Button
                onClick={onCreateStory}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 p-0.5 hover:from-purple-500 hover:to-pink-500"
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Plus className="h-6 w-6 text-gray-600" />
                </div>
              </Button>
              <span className="text-xs text-gray-600">Seu story</span>
            </div>

            {/* Stories dos usuários */}
            {userStories.map((userStory) => (
              <div
                key={userStory._id}
                className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer"
                onClick={() => handleStoryClick(userStory)}
              >
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    userStory.hasUnviewed > 0 ? "bg-gradient-to-r from-purple-400 to-pink-400" : "bg-gray-300"
                  }`}
                >
                  <Avatar className="w-full h-full">
                    {userStory.author.avatar ? (
                      <AvatarImage src={userStory.author.avatar || "/placeholder.svg"} alt={userStory.author.name} />
                    ) : null}
                    <AvatarFallback className="bg-blue-600 text-white">
                      {getInitials(userStory.author.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs text-gray-600 truncate w-16 text-center">
                  {userStory.author.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Story Viewer */}
      <Dialog open={!!selectedStoryGroup} onOpenChange={() => setSelectedStoryGroup(null)}>
        <DialogContent className="p-0 max-w-md mx-auto h-[80vh] bg-black">
          {selectedStoryGroup && (
            <div className="relative w-full h-full">
              {/* Progress bars */}
              <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
                {selectedStoryGroup.stories.map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-1 rounded-full ${
                      index < currentStoryIndex
                        ? "bg-white"
                        : index === currentStoryIndex
                          ? "bg-white/70"
                          : "bg-white/30"
                    }`}
                  />
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-8 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {selectedStoryGroup.author.avatar ? (
                      <AvatarImage
                        src={selectedStoryGroup.author.avatar || "/placeholder.svg"}
                        alt={selectedStoryGroup.author.name}
                      />
                    ) : null}
                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                      {getInitials(selectedStoryGroup.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium text-sm">{selectedStoryGroup.author.name}</p>
                    <p className="text-white/70 text-xs">
                      {formatTime(selectedStoryGroup.stories[currentStoryIndex].createdAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => setSelectedStoryGroup(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Story Image */}
              <img
                src={selectedStoryGroup.stories[currentStoryIndex].image || "/placeholder.svg"}
                alt="Story"
                className="w-full h-full object-cover"
              />

              {/* Story Content */}
              {selectedStoryGroup.stories[currentStoryIndex].content && (
                <div className="absolute bottom-20 left-4 right-4">
                  <p className="text-white text-sm bg-black/50 p-2 rounded">
                    {selectedStoryGroup.stories[currentStoryIndex].content}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <button className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={prevStory} />
              <button className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={nextStory} />

              {/* Actions */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">{selectedStoryGroup.stories[currentStoryIndex].views.length}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-1 ${
                      selectedStoryGroup.stories[currentStoryIndex].likedByUser
                        ? "text-red-500"
                        : "text-white hover:text-red-500"
                    }`}
                    onClick={handleLikeStory}
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        selectedStoryGroup.stories[currentStoryIndex].likedByUser ? "fill-current" : ""
                      }`}
                    />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
