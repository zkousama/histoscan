import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "positive" | "negative" | "pending" | "warning"
  label: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const statusStyles = {
    positive: "bg-green-100 text-green-800 border-green-200",
    negative: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-blue-100 text-blue-800 border-blue-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
  }

  const statusDot = {
    positive: "bg-green-500",
    negative: "bg-red-500",
    pending: "bg-blue-500",
    warning: "bg-amber-500",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className,
      )}
    >
      <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", statusDot[status])}></span>
      {label}
    </span>
  )
}
