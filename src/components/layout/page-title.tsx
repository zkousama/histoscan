import type React from "react"
import { cn } from "@/lib/utils"

interface PageTitleProps {
  title: string
  description?: string
  className?: string
  actions?: React.ReactNode
}

export function PageTitle({ title, description, className, actions }: PageTitleProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  )
}
