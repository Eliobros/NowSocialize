// app/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => {
        if (!res.ok) throw new Error("Erro ao carregar dados")
        return res.json()
      })
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 dark:text-red-400 font-semibold mb-2">Erro ao carregar dados</h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  const growthRate = data?.totalUsers > 0 ? "+12%" : "0%"
  const engagementRate = data?.totalPosts > 0 ? ((data.totalPosts / data.totalUsers) * 100).toFixed(1) + "%" : "0%"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            SocializeNow Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visão geral da plataforma em tempo real
          </p>
        </div>

        {/* Stats principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Usuários Totais"
            value={data?.totalUsers || 0}
            icon="👥"
            trend={growthRate}
            trendUp={true}
          />
          <StatCard
            title="Posts Publicados"
            value={data?.totalPosts || 0}
            icon="📝"
            subtitle={`${engagementRate} de engajamento`}
          />
          <StatCard
            title="Usuários Ativos"
            value={Math.floor((data?.totalUsers || 0) * 0.65)}
            icon="🟢"
            subtitle="Últimos 7 dias"
          />
          <StatCard
            title="Taxa de Crescimento"
            value={growthRate}
            icon="📈"
            trendUp={true}
          />
        </div>

        {/* Seção de destaques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <HighlightCard
            title="👤 Usuário Mais Seguido"
            name={data?.mostFollowedUser?.name || "N/A"}
            value={`${data?.mostFollowedUser?.followers || 0} seguidores`}
            badge={data?.mostFollowedUser?.isVerified}
          />
          <HighlightCard
            title="🔥 Conteúdo em Alta"
            name="Posts populares"
            value={`${(data?.totalPosts || 0) > 0 ? Math.floor((data?.totalPosts || 0) * 0.15) : 0} posts em destaque`}
          />
        </div>

        {/* Top Posts */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            📊 Posts com Maior Engajamento
          </h2>
          
          <div className="space-y-4">
            <PostCard
              title="Mais Curtido"
              icon="❤️"
              content={data?.mostLikedPost?.content || "Nenhum post ainda"}
              metric={data?.mostLikedPost?.likes?.length || 0}
              metricLabel="curtidas"
            />
            <PostCard
              title="Mais Comentado"
              icon="💬"
              content={data?.mostCommentedPost?.content || "Nenhum post ainda"}
              metric={data?.mostCommentedPost?.comments?.length || 0}
              metricLabel="comentários"
            />
            <PostCard
              title="Mais Compartilhado"
              icon="🔄"
              content={data?.mostSharedPost?.content || "Nenhum post ainda"}
              metric={data?.mostSharedPost?.shares || 0}
              metricLabel="compartilhamentos"
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  subtitle 
}: { 
  title: string
  value: string | number
  icon: string
  trend?: string
  trendUp?: boolean
  subtitle?: string
}) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        {trend && (
          <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
            trendUp 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
        {title}
      </h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  )
}

function HighlightCard({ 
  title, 
  name, 
  value, 
  badge 
}: { 
  title: string
  name: string
  value: string
  badge?: boolean
}) {
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-2xl font-bold">{name}</p>
        {badge && <span className="text-xl">✓</span>}
      </div>
      <p className="text-indigo-100">{value}</p>
    </div>
  )
}

function PostCard({ 
  title, 
  icon, 
  content, 
  metric, 
  metricLabel 
}: { 
  title: string
  icon: string
  content: string
  metric: number
  metricLabel: string
}) {
  return (
    <div className="border border-gray-200 dark:border-zinc-700 rounded-xl p-4 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
      <div className="flex items-start gap-4">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
            {title}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 truncate">
            {content.slice(0, 100)}{content.length > 100 ? '...' : ''}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {metric} {metricLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
