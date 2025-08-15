// app/profile/[userId]/page.tsx
import { Metadata } from 'next'
import ProfilePageClient from './ProfilePageClient'
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Função para buscar dados do usuário (server-side)
async function getUserProfile(userId: string) {
  try {
    const client = await clientPromise
    const db = client.db("socializenow")
    const users = db.collection("users")

    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          name: 1,
          username: 1,
          bio: 1,
          avatar: 1,
          isVerified: 1,
          followers: { $size: "$followers" },
          following: { $size: "$following" },
          postsCount: 1
        }
      }
    )

    return user
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }
}

// Gerar metadata dinamicamente
export async function generateMetadata({ params }: { params: { userId: string } }): Promise<Metadata> {
  const user = await getUserProfile(params.userId)

  if (!user) {
    return {
      title: 'Usuário não encontrado - SocializeNow',
      description: 'Este perfil não foi encontrado na SocializeNow',
    }
  }

  const profileUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/profile/${user._id}`
  const userName = user.name
  const userBio = user.bio || `Perfil de ${userName} no SocializeNow`
  const avatarUrl = user.avatar || `${process.env.NEXT_PUBLIC_SITE_URL}/default-avatar.png`

  return {
    title: `${userName} (@${user.username}) - SocializeNow`,
    description: userBio,
    openGraph: {
      title: `${userName} ${user.isVerified ? '✓' : ''} (@${user.username})`,
      description: userBio,
      url: profileUrl,
      siteName: 'SocializeNow',
      images: [
        {
          url: avatarUrl,
          width: 400,
          height: 400,
          alt: `Foto de perfil de ${userName}`,
        }
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${userName} (@${user.username})`,
      description: userBio,
      images: [avatarUrl],
    },
    // Meta tags específicas para perfil
    other: {
      'profile:first_name': userName.split(' ')[0],
      'profile:last_name': userName.split(' ').slice(1).join(' ') || '',
      'profile:username': user.username,
    },
  }
}

// Componente principal (server component)
export default function UserProfilePage({ params }: { params: { userId: string } }) {
  return <ProfilePageClient params={params} />
}