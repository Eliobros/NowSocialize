"use client"

import React, { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2, X, Check } from "lucide-react"
import { User } from "@/types/message"

interface CreateGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupCreated: (groupId: string, conversationId: string) => void
}

export function CreateGroupModal({ open, onOpenChange, onGroupCreated }: CreateGroupModalProps) {
  const [step, setStep] = useState<'name' | 'members'>("name")
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([])
      return
    }

    setSearching(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas imagens")
      return
    }

    setSelectedAvatar(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleNext = () => {
    if (step === "name" && groupName.trim()) {
      setStep("members")
    }
  }

  const handleBack = () => {
    setStep("name")
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.size === 0) return

    setCreating(true)
    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      formData.append("name", groupName)
      if (groupDescription) formData.append("description", groupDescription)
      formData.append("memberIds", JSON.stringify(Array.from(selectedUsers)))
      if (selectedAvatar) formData.append("avatar", selectedAvatar)

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        onGroupCreated(data.groupId, data.conversationId)
        handleClose()
      } else {
        const error = await response.json()
        alert(error.error || "Erro ao criar grupo")
      }
    } catch (error) {
      console.error("Error creating group:", error)
      alert("Erro ao criar grupo")
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setStep("name")
    setGroupName("")
    setGroupDescription("")
    setSelectedAvatar(null)
    setAvatarPreview(null)
    setSearchTerm("")
    setUsers([])
    setSelectedUsers(new Set())
    onOpenChange(false)
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "name" ? "Criar Grupo" : "Adicionar Membros"}
          </DialogTitle>
        </DialogHeader>

        {step === "name" ? (
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <div
                  className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-gray-500" />
                  )}
                </div>
                {avatarPreview && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedAvatar(null)
                      setAvatarPreview(null)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="text-sm font-medium">Nome do Grupo *</label>
              <Input
                placeholder="Ex: Amigos da Faculdade"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Input
                placeholder="Sobre o que é esse grupo?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={100}
              />
            </div>

            <Button
              onClick={handleNext}
              disabled={!groupName.trim()}
              className="w-full"
            >
              Próximo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Buscar usuários */}
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                searchUsers(e.target.value)
              }}
            />

            {/* Usuários selecionados */}
            {selectedUsers.size > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                {Array.from(selectedUsers).map((userId) => {
                  const user = users.find(u => u._id === userId)
                  if (!user) return null
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm"
                    >
                      <span>{user.name}</span>
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleUserSelection(userId)}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Lista de usuários */}
            <ScrollArea className="h-60">
              {searching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? "Nenhum usuário encontrado" : "Busque usuários para adicionar"}
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user._id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.has(user._id) ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleUserSelection(user._id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-blue-600 text-white">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          {user.username && (
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          )}
                        </div>
                      </div>
                      {selectedUsers.has(user._id) && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Botões */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={selectedUsers.size === 0 || creating}
                className="flex-1"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Criar (${selectedUsers.size})`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
