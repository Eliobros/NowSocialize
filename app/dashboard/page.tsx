// app/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(setData)
  }, [])

  if (!data) {
    return <div className="text-center mt-20 text-xl">Carregando dados...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-10">📊 SocializeNow Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card title="Usuários Registrados" value={data.totalUsers} />
        <Card title="Posts Publicados" value={data.totalPosts} />
        <Card title="Usuário Mais Seguido" value={data.mostFollowedUser?.name || "N/A"} />
        <Card title="Post Mais Curtido" value={data.mostLikedPost?.content?.slice(0, 50) + "..."} />
        <Card title="Mais Comentado" value={data.mostCommentedPost?.content?.slice(0, 50) + "..."} />
        <Card title="Mais Compartilhado" value={data.mostSharedPost?.content?.slice(0, 50) + "..."} />
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-md hover:shadow-lg transition">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{value}</p>
    </div>
  )
}
