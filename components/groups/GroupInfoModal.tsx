"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Loader2, 
  Edit2, 
  UserPlus, 
  Crown, 
  UserMinus,
  Shield,
  ShieldOff,
  X,
  Check
} from "lucide-react"
import { Group, User } from "@/types/message"

interface GroupInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  currentUserId: string
}

export function GroupInfoModal({ 
  open, 
  onOpenChange, 
  groupId, 
  currentUserId 
}: GroupInfoModalProps) {
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchUsers, setSearchUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (open && groupId) {
      fetchGroupInfo()
    }
  }, [open, groupId])

  const fetchGroupInfo = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setGroup(data.group)
        setEditName(data.group.name)
        setEditDescription(data.group.description || "")
      }
    } catch (error) {
      console.error("Error fetching group:", error)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = group?.admins.some(id => id === currentUserId)
  const isCreator = group?.createdBy === currentUserId

  const handleSaveEdit = async () => {
    if (!editName.trim()) return

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription
        })
      })

      if (response.ok) {
        await fetchGroupInfo()
        setIsEditing(false)
      } else {
        alert("Erro ao atualizar grupo")
      }
    } catch (error) {
      console.error("Error updating group:", error)
      alert("Erro ao atualizar grupo")
    } finally {
      setSaving(false)
    }
  }

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        await fetchGroupInfo()
      } else {
        const error = await response.json()
        alert(error.error || "Erro ao promover membro")
      }
    } catch (error) {
      console.error("Error promoting member:", error)
    }
  }

  const handleDemoteFromAdmin = async (userId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}/admin`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        await fetchGroupInfo()
      } else {
        const error = await response.json()
        alert(error.error || "Erro ao despromover admin")
      }
    } catch (error) {
      console.error("Error demoting admin:", error)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este membro?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        await fetchGroupInfo()
      } else {
        const error = await response.json()
        alert(error.error || "Erro ao remover membro")
      }
    } catch (error) {
      console.error("Error removing member:", error)
    }
  }

  const searchUsersForGroup = async (query: string) => {
    if (!query.trim()) {
      setSearchUsers([])
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
        // Filtrar usuários que já são membros
        const existingMemberIds = group?.members.map(m => m.userId) || []
        const filtered = data.users.filter((u: User) => !existingMemberIds.includes(u._id))
        setSearchUsers(filtered)
      }
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleAddMembers = async () => {
    if (selectedUsers.size === 0) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userIds: Array.from(selectedUsers) })
      })

      if (response.ok) {
        await fetchGroupInfo()
        setShowAddMembers(false)
        setSearchTerm("")
        setSearchUsers([])
        setSelectedUsers(new Set())
      } else {
        const error = await response.json()
        alert(error.error || "Erro ao adicionar membros")
      }
    } catch (error) {
      console.error("Error adding members:", error)
    }
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!group) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Informações do Grupo</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Avatar e Nome */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20">
                <AvatarImage src={group.avatar} alt={group.name} />
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  {getInitials(group.name)}
                </AvatarFallback>
              </Avatar>

              {isEditing ? (
                <div className="w-full space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nome do grupo"
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Descrição"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-500">{group.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {group.members.length} {group.members.length === 1 ? "membro" : "membros"}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar Info
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Membros */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Membros</h4>
                {isAdmin && !showAddMembers && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddMembers(true)}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>

              {showAddMembers && (
                <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <Input
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      searchUsersForGroup(e.target.value)
                    }}
                  />
                  
                  {selectedUsers.size > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(selectedUsers).map((userId) => {
                        const user = searchUsers.find(u => u._id === userId)
                        if (!user) return null
                        return (
                          <div
                            key={userId}
                            className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm"
                          >
                            <span>{user.name}</span>
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                const newSet = new Set(selectedUsers)
                                newSet.delete(userId)
                                setSelectedUsers(newSet)
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {searching ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : searchUsers.length > 0 ? (
                      searchUsers.map((user) => (
                        <div
                          key={user._id}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                            selectedUsers.has(user._id) ? "bg-blue-50" : "hover:bg-gray-100"
                          }`}
                          onClick={() => {
                            const newSet = new Set(selectedUsers)
                            if (newSet.has(user._id)) {
                              newSet.delete(user._id)
                            } else {
                              newSet.add(user._id)
                            }
                            setSelectedUsers(newSet)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.name}</span>
                          </div>
                          {selectedUsers.has(user._id) && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      ))
                    ) : searchTerm ? (
                      <p className="text-sm text-gray-500 text-center py-4">Nenhum usuário encontrado</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddMembers(false)
                        setSearchTerm("")
                        setSearchUsers([])
                        setSelectedUsers(new Set())
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddMembers}
                      disabled={selectedUsers.size === 0}
                      className="flex-1"
                    >
                      Adicionar ({selectedUsers.size})
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {group.members.map((member: any) => {
                  const memberIsAdmin = group.admins.includes(member.userId)
                  const memberIsCreator = group.createdBy === member.userId
                  const isSelf = member.userId === currentUserId

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback className="bg-blue-600 text-white">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.name}
                            {isSelf && <span className="text-gray-500"> (você)</span>}
                          </p>
                          <div className="flex items-center gap-2">
                            {memberIsCreator && (
                              <span className="text-xs text-yellow-600 flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                Criador
                              </span>
                            )}
                            {memberIsAdmin && !memberIsCreator && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações (apenas para admins) */}
                      {isAdmin && !isSelf && !memberIsCreator && (
                        <div className="flex gap-1">
                          {memberIsAdmin ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDemoteFromAdmin(member.userId)}
                              className="h-8 w-8 p-0"
                              title="Remover admin"
                            >
                              <ShieldOff className="h-4 w-4 text-gray-600" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePromoteToAdmin(member.userId)}
                              className="h-8 w-8 p-0"
                              title="Promover a admin"
                            >
                              <Shield className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.userId)}
                            className="h-8 w-8 p-0"
                            title="Remover membro"
                          >
                            <UserMinus className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sair do grupo */}
            {!isCreator && (
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleRemoveMember(currentUserId)}
              >
                Sair do Grupo
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
