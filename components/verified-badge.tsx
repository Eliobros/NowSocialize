import { BadgeCheck } from "lucide-react"

export type BadgeType = "dono" | "dev_sn" | "dev" | "empresa" | "verificado"

const BADGE_CONFIG: Record<BadgeType, { color: string; label: string }> = {
  dono: { color: "#FFD700", label: "Dono da SocializeNow" },
  dev_sn: { color: "#8B5CF6", label: "Dev SocializeNow" },
  dev: { color: "#10B981", label: "Desenvolvedor" },
  empresa: { color: "#3B82F6", label: "Empresa Oficial" },
  verificado: { color: "#00BAFF", label: "Verificado" },
}

interface VerifiedBadgeProps {
  type?: BadgeType
  size?: number
  className?: string
}

export function VerifiedBadge({ type = "verificado", size = 18, className = "" }: VerifiedBadgeProps) {
  const config = BADGE_CONFIG[type] || BADGE_CONFIG.verificado
  
  return (
    <BadgeCheck
      size={size}
      fill={config.color}
      stroke="white"
      title={config.label}
      className={`inline-block flex-shrink-0 ${className}`}
    />
  )
}

export { BADGE_CONFIG }
