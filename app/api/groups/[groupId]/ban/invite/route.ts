// api/groups/[groupId]/invite/route.ts - GERENCIAR LINKS DE CONVITE
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { generateInviteCode, isInviteLinkValid } from "@/utils/groupHelpers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch (error) {
    return null
  }
}

// ==========================================
// CRIAR OU ATUALIZAR LINK DE CONVITE
// ==========================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { groupId } = await params
    const { expiresAt, maxUses } = await request.json()

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")
    const messages = db.collection("messages")

    const group = await groups.findOne({ _id: new ObjectId(groupId) })
    if (!group) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Verificar se é admin
    const member = group.members.find((m: any) => m.userId.equals(new ObjectId(user.userId)))
    if (!member || member.role === 'member') {
      return NextResponse.json({ 
        error: "Apenas administradores podem criar links de convite" 
      }, { status: 403 })
    }

    const now = new Date()
    const code = generateInviteCode()

    const inviteLink = {
      code,
      enabled: true,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses: maxUses || null,
      usedCount: 0,
      usedBy: [],
      createdBy: new ObjectId(user.userId),
      createdAt: now
    }

    await groups.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $set: { 
          inviteLink,
          updatedAt: now
        }
      }
    )

    // Criar mensagem de sistema
    const systemMessage = {
      groupId: new ObjectId(groupId),
      sender: "system",
      content: "",
      type: "system",
      systemEvent: {
        type: "invite_link_created",
        actor: user.userId
      },
      readBy: [new ObjectId(user.userId)],
      createdAt: now
    }

    await messages.insertOne(systemMessage)

    return NextResponse.json({ 
      message: "Link de convite criado com sucesso",
      inviteCode: code,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/groups/join/${code}`
    })
  } catch (error) {
    console.error("Create invite link error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// REVOGAR LINK DE CONVITE
// ==========================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { groupId } = await params

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")
    const messages = db.collection("messages")

    const group = await groups.findOne({ _id: new ObjectId(groupId) })
    if (!group) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Verificar se é admin
    const member = group.members.find((m: any) => m.userId.equals(new ObjectId(user.userId)))
    if (!member || member.role === 'member') {
      return NextResponse.json({ 
        error: "Apenas administradores podem revogar links de convite" 
      }, { status: 403 })
    }

    if (!group.inviteLink) {
      return NextResponse.json({ error: "Grupo não possui link de convite" }, { status: 400 })
    }

    const now = new Date()

    await groups.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $set: { 
          "inviteLink.enabled": false,
          updatedAt: now
        }
      }
    )

    // Criar mensagem de sistema
    const systemMessage = {
      groupId: new ObjectId(groupId),
      sender: "system",
      content: "",
      type: "system",
      systemEvent: {
        type: "invite_link_revoked",
        actor: user.userId
      },
      readBy: [new ObjectId(user.userId)],
      createdAt: now
    }

    await messages.insertOne(systemMessage)

    return NextResponse.json({ message: "Link de convite revogado com sucesso" })
  } catch (error) {
    console.error("Revoke invite link error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// OBTER INFO DO LINK DE CONVITE
// ==========================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { groupId } = await params

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")

    const group = await groups.findOne({ _id: new ObjectId(groupId) })
    if (!group) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Verificar se é membro
    const member = group.members.find((m: any) => m.userId.equals(new ObjectId(user.userId)))
    if (!member) {
      return NextResponse.json({ error: "Você não é membro deste grupo" }, { status: 403 })
    }

    if (!group.inviteLink) {
      return NextResponse.json({ inviteLink: null })
    }

    return NextResponse.json({ 
      inviteLink: {
        ...group.inviteLink,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/groups/join/${group.inviteLink.code}`
      }
    })
  } catch (error) {
    console.error("Get invite link error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
