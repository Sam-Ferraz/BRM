import { useTimezone } from "@/hooks/use-timezone"
import { formatDateTime, formatDate } from "@/lib/datetime"

interface ReactiveDateTimeProps {
  value: string
  type?: 'datetime' | 'date'
  className?: string
}

export function ReactiveDateTime({ value, type = 'datetime', className }: ReactiveDateTimeProps) {
  const timezone = useTimezone()
  
  const formattedValue = type === 'datetime' 
    ? formatDateTime(value, timezone)
    : formatDate(value, timezone)
  
  return (
    <span className={className}>
      {formattedValue}
    </span>
  )
}