import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import jwt from "jsonwebtoken"
import { EndToEndEncryption } from "@/lib/encryption"

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.split(" ")[1]

  if (!token) {
    return NextResponse.json({ error: "Não autorizado: Token não fornecido." }, { status: 401 })
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error("JWT_SECRET não configurado nas variáveis de ambiente.")
    return NextResponse.json({ error: "Erro de configuração do servidor." }, { status: 500 })
  }

  let userId: string
  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    userId = decoded.userId
  } catch (error) {
    console.error("Erro ao verificar token JWT:", error)
    return NextResponse.json({ error: "Não autorizado: Token inválido ou expirado." }, { status: 401 })
  }

  try {
    const { action, recipientId, conversationKey } = await req.json()

    const client = await clientPromise
    const db = client.db("socializenow")
    const usersCollection = db.collection("users")
    const encryptionKeysCollection = db.collection("encryption_keys")

    switch (action) {
      case "generate_keys":
        // Gerar novo par de chaves para o usuário
        const keyPair = await EndToEndEncryption.generateKeyPair()
        
        await encryptionKeysCollection.updateOne(
          { userId: new ObjectId(userId) },
          {
            $set: {
              userId: new ObjectId(userId),
              publicKey: keyPair.publicKey,
              privateKey: keyPair.privateKey, // Em produção, isso deveria ser criptografado
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          },
          { upsert: true }
        )

        return NextResponse.json({
          success: true,
          publicKey: keyPair.publicKey,
        })

      case "get_public_key":
        // Obter chave pública de outro usuário
        if (!recipientId) {
          return NextResponse.json({ error: "ID do destinatário é obrigatório." }, { status: 400 })
        }

        const recipientKeys = await encryptionKeysCollection.findOne({
          userId: new ObjectId(recipientId)
        })

        if (!recipientKeys) {
          return NextResponse.json({ error: "Chaves de criptografia não encontradas." }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          publicKey: recipientKeys.publicKey,
        })

      case "encrypt_conversation_key":
        // Criptografar chave de conversa com chave pública do destinatário
        if (!recipientId || !conversationKey) {
          return NextResponse.json({ error: "ID do destinatário e chave de conversa são obrigatórios." }, { status: 400 })
        }

        const recipientPublicKey = await encryptionKeysCollection.findOne({
          userId: new ObjectId(recipientId)
        })

        if (!recipientPublicKey) {
          return NextResponse.json({ error: "Chave pública do destinatário não encontrada." }, { status: 404 })
        }

        const encryptedKey = await EndToEndEncryption.encryptConversationKey(
          conversationKey,
          recipientPublicKey.publicKey
        )

        return NextResponse.json({
          success: true,
          encryptedConversationKey: encryptedKey,
        })

      case "decrypt_conversation_key":
        // Descriptografar chave de conversa com chave privada
        if (!conversationKey) {
          return NextResponse.json({ error: "Chave de conversa criptografada é obrigatória." }, { status: 400 })
        }

        const userKeys = await encryptionKeysCollection.findOne({
          userId: new ObjectId(userId)
        })

        if (!userKeys) {
          return NextResponse.json({ error: "Chaves de criptografia não encontradas." }, { status: 404 })
        }

        const decryptedKey = await EndToEndEncryption.decryptConversationKey(
          conversationKey,
          userKeys.privateKey
        )

        return NextResponse.json({
          success: true,
          conversationKey: decryptedKey,
        })

      default:
        return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
    }
  } catch (error) {
    console.error("Erro ao processar chaves de criptografia:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.split(" ")[1]

  if (!token) {
    return NextResponse.json({ error: "Não autorizado: Token não fornecido." }, { status: 401 })
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error("JWT_SECRET não configurado nas variáveis de ambiente.")
    return NextResponse.json({ error: "Erro de configuração do servidor." }, { status: 500 })
  }

  let userId: string
  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    userId = decoded.userId
  } catch (error) {
    console.error("Erro ao verificar token JWT:", error)
    return NextResponse.json({ error: "Não autorizado: Token inválido ou expirado." }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db("socializenow")
    const encryptionKeysCollection = db.collection("encryption_keys")

    const userKeys = await encryptionKeysCollection.findOne({
      userId: new ObjectId(userId)
    })

    if (!userKeys) {
      return NextResponse.json({ error: "Chaves de criptografia não encontradas." }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      hasKeys: true,
      publicKey: userKeys.publicKey,
      createdAt: userKeys.createdAt,
      updatedAt: userKeys.updatedAt,
    })
  } catch (error) {
    console.error("Erro ao buscar chaves de criptografia:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}