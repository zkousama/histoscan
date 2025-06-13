import type React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  className?: string
  iconClassName?: string
  valueClassName?: string
}

export function StatsCard({ title, value, icon, className, iconClassName, valueClassName }: StatsCardProps) {
  return (
    <Card className={cn("p-6 border-slate-200 shadow-sm", className)}>
      <div className="flex items-center">
        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center mr-4", iconClassName)}>{icon}</div>
        <div>
          <p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>
          <p className="text-slate-600 text-sm">{title}</p>
        </div>
      </div>
    </Card>
  )
}
