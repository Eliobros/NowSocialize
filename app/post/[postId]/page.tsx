// app/post/[postId]/page.tsx
import { Metadata } from 'next'
import PostPageClient from './PostPageClient'
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Função para buscar dados do post (server-side)
async function getPost(postId: string) {
  try {
    const client = await clientPromise
    const db = client.db("socializenow")
    const posts = db.collection("posts")

    const post = await posts.aggregate([
      {
        $match: { _id: new ObjectId(postId) }
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $unwind: "$author",
      },
      {
        $project: {
          content: 1,
          image: 1,
          createdAt: 1,
          likes: 1,
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,
          "author.isVerified": 1,
        },
      },
    ]).toArray()

    return post[0] || null
  } catch (error) {
    console.error('Erro ao buscar post:', error)
    return null
  }
}

// Gerar metadata dinamicamente
export async function generateMetadata({ params }: { params: { postId: string } }): Promise<Metadata> {
  const post = await getPost(params.postId)

  if (!post) {
    return {
      title: 'Post não encontrado - SocializeNow',
      description: 'Este post não foi encontrado na SocializeNow',
    }
  }

  const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/post/${post._id}`
  const authorName = post.author.name
  const postContent = post.content || 'Veja este post no SocializeNow'
  const description = postContent.length > 160 ? postContent.substring(0, 157) + '...' : postContent

  // Escolhe a melhor imagem para preview
  const imageUrl = post.image || post.author.avatar || `${process.env.NEXT_PUBLIC_SITE_URL}/default-post.png`

  const title = `${authorName} ${post.author.isVerified ? '✓' : ''} no SocializeNow`

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: postUrl,
      siteName: 'SocializeNow',
      images: [
        {
          url: imageUrl,
          width: post.image ? 1200 : 400, // Se tem imagem do post, usa maior
          height: post.image ? 630 : 400,  // Proporção ideal para redes sociais
          alt: post.image ? 'Imagem do post' : `Foto de perfil de ${authorName}`,
        }
      ],
      type: 'article',
      // Meta tags específicas para artigo
      publishedTime: post.createdAt,
      authors: [authorName],
    },
    twitter: {
      card: post.image ? 'summary_large_image' : 'summary', // Card grande se tem imagem
      title: title,
      description: description,
      images: [imageUrl],
      creator: `@${post.author.username || post.author.name}`,
    },
    // Meta tags adicionais
    other: {
      'article:author': authorName,
      'article:published_time': post.createdAt,
    },
  }
}

// Componente principal (server component)
export default function PostPage({ params }: { params: { postId: string } }) {
  return <PostPageClient params={params} />
}