import type React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

export function PageContainer({ children, className, maxWidth = "xl" }: PageContainerProps) {
  const maxWidthClass = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8">
      <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", maxWidthClass[maxWidth], className)}>{children}</div>
    </main>
  )
}
