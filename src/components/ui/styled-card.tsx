import type React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StyledCardProps {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  title?: string
  description?: string
  footer?: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
}

export function StyledCard({
  children,
  className,
  contentClassName,
  title,
  description,
  footer,
  icon,
}: StyledCardProps) {
  return (
    <Card className={cn("border-slate-200 shadow-sm", className)}>
      {(title || description) && (
        <CardHeader className="pb-3">
          {title && (
            <CardTitle className="text-lg flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
          )}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn("pt-3", contentClassName)}>{children}</CardContent>
      {footer && <CardFooter className="border-t bg-slate-50 px-6 py-3">{footer}</CardFooter>}
    </Card>
  )
}
