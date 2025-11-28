"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Loader2, 
  Link as LinkIcon, 
  Copy, 
  RefreshCw,
  Calendar,
  Users,
  Shield,
  Settings
} from "lucide-react"
import { GroupDocument } from "@/models/Group"

interface GroupSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  currentUserId: string
}

export function GroupSettingsModal({ 
  open, 
  onOpenChange, 
  groupId, 
  currentUserId 
}: GroupSettingsModalProps) {
  const [group, setGroup] = useState<GroupDocument | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Settings
  const [settings, setSettings] = useState({
    onlyAdminsCanSend: false,
    onlyAdminsCanEditInfo: true,
    allowMembersToAddOthers: false,
    maxMembers: 256
  })
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Invite Link
  const [inviteLink, setInviteLink] = useState<any>(null)
  const [expiresAt, setExpiresAt] = useState("")
  const [maxUses, setMaxUses] = useState<number | null>(null)
  const [creatingLink, setCreatingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && groupId) {
      fetchGroupInfo()
      fetchInviteLink()
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
        setSettings(data.group.settings)
      }
    } catch (error) {
      console.error("Error fetching group:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInviteLink = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}/invite`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setInviteLink(data.inviteLink)
      }
    } catch (error) {
      console.error("Error fetching invite link:", error)
    }
  }

  const isAdmin = group?.members.find(m => m.userId === currentUserId)?.role !== 'member'
  const isSuperAdmin = group?.createdBy === currentUserId

  const handleSaveSettings = async () => {
    if (!isSuperAdmin) return

    setSavingSettings(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings })
      })

      if (response.ok) {
        alert("Configurações atualizadas com sucesso!")
        await fetchGroupInfo()
      } else {
        const error = await response.json()
        alert(error.error || "Erro ao atualizar configurações")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Erro ao atualizar configurações")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleCreateInviteLink = async () => {
    setCreatingLink(true)
    try {
      const token = localStorage.getItem("token")
      const body: any = {}
      if (expiresAt) body.expiresAt = expiresAt
      if (maxUses) body.maxUses = maxUses

      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const data = await response.json()
        alert("Link de convite criado!")
        await fetchInviteLink()
      } else {
        const error = await response.json()
        alert(error.error || "Erro ao criar link")
      }
    } catch (error) {
      console.error("Error creating invite link:", error)
      alert("Erro ao criar link")
    } finally {
      setCreatingLink(false)
    }
  }

  const handleRevokeInviteLink = async () => {
    if (!confirm("Tem certeza que deseja revogar o link de convite?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        alert("Link de convite revogado!")
        await fetchInviteLink()
      } else {
        const error = await response.json()
        alert(error.error || "Erro ao revogar link")
      }
    } catch (error) {
      console.error("Error revoking invite link:", error)
    }
  }

  const handleCopyLink = () => {
    if (inviteLink?.url) {
      navigator.clipboard.writeText(inviteLink.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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

  if (!group || !isAdmin) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Grupo
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            <TabsTrigger value="invite">Link de Convite</TabsTrigger>
          </TabsList>

          {/* TAB: CONFIGURAÇÕES */}
          <TabsContent value="settings" className="space-y-4">
            {isSuperAdmin ? (
              <>
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Apenas admins podem enviar mensagens</Label>
                      <p className="text-sm text-gray-500">
                        Membros comuns não poderão enviar mensagens
                      </p>
                    </div>
                    <Switch
                      checked={settings.onlyAdminsCanSend}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, onlyAdminsCanSend: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Apenas admins podem editar info do grupo</Label>
                      <p className="text-sm text-gray-500">
                        Nome, descrição e foto do grupo
                      </p>
                    </div>
                    <Switch
                      checked={settings.onlyAdminsCanEditInfo}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, onlyAdminsCanEditInfo: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Membros podem adicionar outros</Label>
                      <p className="text-sm text-gray-500">
                        Qualquer membro pode convidar pessoas
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowMembersToAddOthers}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, allowMembersToAddOthers: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Limite máximo de membros</Label>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <Input
                        type="number"
                        min={1}
                        max={1024}
                        value={settings.maxMembers}
                        onChange={(e) => 
                          setSettings({ ...settings, maxMembers: parseInt(e.target.value) || 256 })
                        }
                        className="w-32"
                      />
                      <span className="text-sm text-gray-500">membros</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveSettings} 
                  disabled={savingSettings}
                  className="w-full"
                >
                  {savingSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Salvar Configurações"
                  )}
                </Button>
              </>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Apenas o criador do grupo pode alterar as configurações
              </p>
            )}
          </TabsContent>

          {/* TAB: LINK DE CONVITE */}
          <TabsContent value="invite" className="space-y-4">
            {inviteLink && inviteLink.enabled ? (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <div>
                  <Label>Link de Convite</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value={inviteLink.url} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleCopyLink}
                      variant="outline"
                    >
                      {copied ? "Copiado!" : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Usos</p>
                    <p className="font-medium">
                      {inviteLink.usedCount}
                      {inviteLink.maxUses && ` / ${inviteLink.maxUses}`}
                    </p>
                  </div>
                  {inviteLink.expiresAt && (
                    <div>
                      <p className="text-gray-500">Expira em</p>
                      <p className="font-medium">
                        {new Date(inviteLink.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <Button 
                  variant="destructive" 
                  onClick={handleRevokeInviteLink}
                  className="w-full"
                >
                  Revogar Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4 p-4 border rounded-lg">
                <p className="text-gray-600">
                  Crie um link de convite para que outras pessoas possam entrar no grupo
                </p>

                <div className="space-y-2">
                  <Label>Data de Expiração (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Limite de Usos (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Ilimitado"
                      value={maxUses || ""}
                      onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-32"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateInviteLink} 
                  disabled={creatingLink}
                  className="w-full"
                >
                  {creatingLink ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Criar Link de Convite
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
