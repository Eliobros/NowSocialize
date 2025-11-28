// api/groups/join/[code]/route.ts - ENTRAR NO GRUPO VIA LINK
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { isInviteLinkValid, isUserBanned } from "@/utils/groupHelpers"

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
// OBTER INFO DO GRUPO PELO CÓDIGO DO LINK
// ==========================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")

    const group = await groups.findOne({ 
      "inviteLink.code": code 
    })

    if (!group) {
      return NextResponse.json({ error: "Link de convite inválido" }, { status: 404 })
    }

    // Verificar se link é válido
    const linkCheck = isInviteLinkValid(group as any)
    if (!linkCheck.valid) {
      return NextResponse.json({ error: linkCheck.reason }, { status: 400 })
    }

    // Retornar apenas info básica do grupo (para preview)
    return NextResponse.json({ 
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        memberCount: group.members.length,
        maxMembers: group.settings.maxMembers
      }
    })
  } catch (error) {
    console.error("Get group by invite error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ==========================================
// ENTRAR NO GRUPO VIA LINK
// ==========================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { code } = await params

    const client = await clientPromise
    const db = client.db("socializenow")
    const groups = db.collection("groups")
    const conversations = db.collection("conversations")
    const messages = db.collection("messages")

    const group = await groups.findOne({ 
      "inviteLink.code": code 
    })

    if (!group) {
      return NextResponse.json({ error: "Link de convite inválido" }, { status: 404 })
    }

    // Verificar se link é válido
    const linkCheck = isInviteLinkValid(group as any)
    if (!linkCheck.valid) {
      return NextResponse.json({ error: linkCheck.reason }, { status: 400 })
    }

    // Verificar se já é membro
    const alreadyMember = group.members.some((m: any) => 
      m.userId.equals(new ObjectId(user.userId))
    )

    if (alreadyMember) {
      return NextResponse.json({ 
        message: "Você já é membro deste grupo",
        groupId: group._id
      })
    }

    // Verificar se está banido
    if (isUserBanned(user.userId, group as any)) {
      return NextResponse.json({ 
        error: "Você foi banido deste grupo e não pode entrar" 
      }, { status: 403 })
    }

    // Verificar se já usou este link
    const alreadyUsed = group.inviteLink.usedBy?.includes(user.userId)
    if (alreadyUsed) {
      return NextResponse.json({ 
        error: "Você já usou este link de convite" 
      }, { status: 400 })
    }

    const now = new Date()

    // Adicionar usuário ao grupo
    const newMember = {
      userId: new ObjectId(user.userId),
      role: "member",
      joinedAt: now,
      joinMethod: "link",
      messageCount: 0
    }

    await groups.updateOne(
      { _id: group._id },
      { 
        $push: { 
          members: newMember,
          "inviteLink.usedBy": user.userId
        },
        $inc: { 
          "inviteLink.usedCount": 1,
          "stats.totalMembers": 1
        },
        $set: { 
          updatedAt: now
        }
      }
    )

    // Criar mensagem de sistema
    const systemMessage = {
      groupId: group._id,
      sender: "system",
      content: "",
      type: "system",
      systemEvent: {
        type: "user_joined_via_link",
        actor: user.userId
      },
      readBy: [new ObjectId(user.userId)],
      createdAt: now
    }

    await messages.insertOne(systemMessage)

    // Buscar conversa do grupo
    const conversation = await conversations.findOne({ 
      groupId: group._id 
    })

    // Emitir via Socket.io
    const io = (global as any).io
    if (io) {
      io.to(user.userId).emit('joined_group', {
        groupId: group._id.toString(),
        conversationId: conversation?._id.toString()
      })
      
      io.to(group._id.toString()).emit('user_joined', {
        groupId: group._id.toString(),
        userId: user.userId
      })
    }

    return NextResponse.json({ 
      message: "Você entrou no grupo com sucesso!",
      groupId: group._id,
      conversationId: conversation?._id
    })
  } catch (error) {
    console.error("Join group error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
