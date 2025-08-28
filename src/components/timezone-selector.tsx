import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'Europe/London', label: 'London (UTC+0/+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1/+2)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)' },
  { value: 'UTC', label: 'UTC (UTC+0)' },
]

export function TimezoneSelector() {
  const { t } = useTranslation()
  const [selectedTimezone, setSelectedTimezone] = useState<string>('America/Sao_Paulo')

  useEffect(() => {
    const savedTimezone = localStorage.getItem('userTimezone')
    if (savedTimezone && TIMEZONES.find(tz => tz.value === savedTimezone)) {
      setSelectedTimezone(savedTimezone)
    }
  }, [])

  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone)
    localStorage.setItem('userTimezone', timezone)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('timezoneChanged', { detail: timezone }))
  }

  return (
    <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={t('selectTimezone')} />
      </SelectTrigger>
      <SelectContent>
        {TIMEZONES.map((timezone) => (
          <SelectItem key={timezone.value} value={timezone.value}>
            {timezone.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}