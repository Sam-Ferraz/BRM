import { useState, useEffect } from 'react'

export function useTimezone() {
  const [timezone, setTimezone] = useState<string>(() => {
    return localStorage.getItem('userTimezone') || 'America/Sao_Paulo'
  })

  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      setTimezone(event.detail)
    }

    window.addEventListener('timezoneChanged', handleTimezoneChange as EventListener)

    return () => {
      window.removeEventListener('timezoneChanged', handleTimezoneChange as EventListener)
    }
  }, [])

  return timezone
}