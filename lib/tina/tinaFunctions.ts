// lib/tina/tinaFunctions.ts
// Function Calling para Tina IA - Consultas ao MongoDB (dados do usuário autenticado)

import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

async function getDb() {
  const client = await clientPromise
  return client.db("socializenow")
}

// ============================================
// 📋 DECLARAÇÕES DE FUNÇÕES (Schema Gemini)
// ============================================

export const functionDeclarations = [
  {
    name: "minha_conta",
    description: "Retorna informações da conta do usuário autenticado: nome, email, username, data de criação, interesses, etc.",
    parameters: {
      type: "OBJECT" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "meus_posts",
    description: "Lista os posts do usuário autenticado, podendo limitar a quantidade",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limite: {
          type: "NUMBER" as const,
          description: "Quantidade máxima de posts a retornar (padrão: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "meus_seguidores",
    description: "Lista os seguidores do usuário autenticado",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limite: {
          type: "NUMBER" as const,
          description: "Quantidade máxima de seguidores a retornar (padrão: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "quem_eu_sigo",
    description: "Lista os usuários que o usuário autenticado segue",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limite: {
          type: "NUMBER" as const,
          description: "Quantidade máxima de resultados (padrão: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "minhas_estatisticas",
    description: "Retorna estatísticas do usuário: total de posts, likes recebidos, comentários, seguidores, seguindo",
    parameters: {
      type: "OBJECT" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "meus_interesses",
    description: "Retorna os interesses que o usuário selecionou no cadastro",
    parameters: {
      type: "OBJECT" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "minhas_notificacoes",
    description: "Lista as notificações mais recentes do usuário autenticado",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limite: {
          type: "NUMBER" as const,
          description: "Quantidade de notificações (padrão: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "sugerir_texto_post",
    description: "Gera uma sugestão de texto para o usuário publicar como post, baseado em um assunto/tema fornecido",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        assunto: {
          type: "STRING" as const,
          description: "O assunto ou tema sobre o qual o post deve ser escrito",
        },
        tom: {
          type: "STRING" as const,
          description: "Tom do texto: casual, profissional, engraçado, motivacional, informativo",
        },
      },
      required: ["assunto"],
    },
  },
]

// ============================================
// 🔧 IMPLEMENTAÇÕES DAS FUNÇÕES
// ============================================

const functionImplementations: Record<string, (args: any, userId: string) => Promise<any>> = {
  async minha_conta(_args: any, userId: string) {
    const db = await getDb()
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    )

    if (!user) return { erro: "Usuário não encontrado" }

    const followersCount = await db.collection("follows").countDocuments({ followingId: new ObjectId(userId) })
    const followingCount = await db.collection("follows").countDocuments({ followerId: new ObjectId(userId) })
    const postsCount = await db.collection("posts").countDocuments({ authorId: new ObjectId(userId) })

    return {
      nome: user.name,
      email: user.email,
      username: user.username,
      email_verificado: user.userEmailVerified ?? false,
      verificado: user.isVerified ?? false,
      interesses: user.interests || [],
      total_posts: postsCount,
      total_seguidores: followersCount,
      total_seguindo: followingCount,
      cadastrado_em: user.createdAt,
    }
  },

  async meus_posts({ limite = 10 }: any, userId: string) {
    const db = await getDb()
    const posts = await db
      .collection("posts")
      .find({ authorId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limite)
      .toArray()

    return {
      total: posts.length,
      posts: posts.map((p) => ({
        id: p._id.toString(),
        conteudo: p.content?.substring(0, 200),
        tem_imagem: !!p.image,
        likes: p.likes || 0,
        criado_em: p.createdAt,
      })),
    }
  },

  async meus_seguidores({ limite = 20 }: any, userId: string) {
    const db = await getDb()
    const follows = await db
      .collection("follows")
      .aggregate([
        { $match: { followingId: new ObjectId(userId) } },
        {
          $lookup: {
            from: "users",
            localField: "followerId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $limit: limite },
        {
          $project: {
            "user.name": 1,
            "user.username": 1,
            "user.avatar": 1,
            createdAt: 1,
          },
        },
      ])
      .toArray()

    return {
      total: follows.length,
      seguidores: follows.map((f) => ({
        nome: f.user.name,
        username: f.user.username,
        desde: f.createdAt,
      })),
    }
  },

  async quem_eu_sigo({ limite = 20 }: any, userId: string) {
    const db = await getDb()
    const follows = await db
      .collection("follows")
      .aggregate([
        { $match: { followerId: new ObjectId(userId) } },
        {
          $lookup: {
            from: "users",
            localField: "followingId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $limit: limite },
        {
          $project: {
            "user.name": 1,
            "user.username": 1,
            "user.avatar": 1,
            createdAt: 1,
          },
        },
      ])
      .toArray()

    return {
      total: follows.length,
      seguindo: follows.map((f) => ({
        nome: f.user.name,
        username: f.user.username,
        desde: f.createdAt,
      })),
    }
  },

  async minhas_estatisticas(_args: any, userId: string) {
    const db = await getDb()
    const uid = new ObjectId(userId)

    const [postsCount, followersCount, followingCount, likesReceived] = await Promise.all([
      db.collection("posts").countDocuments({ authorId: uid }),
      db.collection("follows").countDocuments({ followingId: uid }),
      db.collection("follows").countDocuments({ followerId: uid }),
      db
        .collection("posts")
        .aggregate([
          { $match: { authorId: uid } },
          { $group: { _id: null, totalLikes: { $sum: "$likes" } } },
        ])
        .toArray(),
    ])

    return {
      total_posts: postsCount,
      total_seguidores: followersCount,
      total_seguindo: followingCount,
      total_likes_recebidos: likesReceived[0]?.totalLikes || 0,
    }
  },

  async meus_interesses(_args: any, userId: string) {
    const db = await getDb()
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { interests: 1 } }
    )

    return {
      interesses: user?.interests || [],
    }
  },

  async minhas_notificacoes({ limite = 10 }: any, userId: string) {
    const db = await getDb()
    const notifs = await db
      .collection("notifications")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limite)
      .toArray()

    return {
      total: notifs.length,
      notificacoes: notifs.map((n) => ({
        tipo: n.type,
        mensagem: n.message?.substring(0, 100),
        lida: !!n.readAt,
        data: n.createdAt,
      })),
    }
  },

  async sugerir_texto_post({ assunto, tom = "casual" }: any, _userId: string) {
    // This function is special - it just returns context for the AI to generate the text
    return {
      instrucao: `Gere um texto criativo para post de rede social sobre "${assunto}" com tom ${tom}. O texto deve ser natural, envolvente e adequado para a SocializeNow. Máximo de 280 caracteres.`,
      assunto,
      tom,
    }
  },
}

// ============================================
// 🔧 EXECUTOR DE FUNÇÕES
// ============================================

export async function executeFunction(functionName: string, args: any, userId: string) {
  const fn = functionImplementations[functionName]
  if (!fn) {
    return { erro: `Função '${functionName}' não encontrada` }
  }

  try {
    console.log(`🔧 Tina IA - Executando: ${functionName}`, JSON.stringify(args))
    const result = await fn(args, userId)
    console.log(`✅ Função ${functionName} executada com sucesso`)
    return result
  } catch (error: any) {
    console.error(`❌ Erro na função ${functionName}:`, error.message)
    return { erro: `Falha ao executar ${functionName}: ${error.message}` }
  }
}
