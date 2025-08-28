import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import i18n from './i18n'

function getUserTimezone(): string {
  return localStorage.getItem('userTimezone') || 'America/Sao_Paulo'
}

function getDateLocale(): string {
  switch (i18n.language) {
    case 'pt-BR':
      return 'pt-BR'
    case 'en-US':
      return 'en-US'
    case 'es-ES':
      return 'es-ES'
    default:
      return 'pt-BR'
  }
}

export function formatDateTime(dateTimeStr: string, timezone?: string): string {
  if (!dateTimeStr) return ""
  
  try {
    // Clean up malformed datetime strings first
    let cleanedDateTimeStr = dateTimeStr
    
    // Fix malformed time like "14:00:00:00" -> "14:00:00"
    cleanedDateTimeStr = cleanedDateTimeStr.replace(/:00:00$/, ':00')
    
    // Handle different datetime formats from the database
    let date: Date
    if (cleanedDateTimeStr.includes('T')) {
      // ISO format - check if it has timezone info
      if (cleanedDateTimeStr.endsWith('Z') || cleanedDateTimeStr.includes('+') || /T\d{2}:\d{2}:\d{2}[+-]\d{2}/.test(cleanedDateTimeStr)) {
        // Has timezone info, parse directly
        date = parseISO(cleanedDateTimeStr)
      } else {
        // No timezone info, assume it's UTC (from database storage)
        date = new Date(cleanedDateTimeStr + 'Z')
      }
    } else {
      // For "YYYY-MM-DD" format, create date in UTC
      date = new Date(cleanedDateTimeStr + 'T00:00:00.000Z')
    }
    
    if (!isValid(date)) return dateTimeStr
    
    // Use Intl.DateTimeFormat for timezone conversion
    const userTimezone = timezone || getUserTimezone()
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: userTimezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    return formatter.format(date)
  } catch {
    return dateTimeStr
  }
}

export function formatDate(dateStr: string, timezone?: string): string {
  if (!dateStr) return ""
  
  try {
    // Handle different date formats from the database
    let date: Date
    if (dateStr.includes('T')) {
      // ISO format - check if it has timezone info
      if (dateStr.endsWith('Z') || dateStr.includes('+') || /T\d{2}:\d{2}:\d{2}[+-]\d{2}/.test(dateStr)) {
        // Has timezone info, parse directly
        date = parseISO(dateStr)
      } else {
        // No timezone info, assume it's UTC (from database storage)
        date = new Date(dateStr + 'Z')
      }
    } else {
      // For "YYYY-MM-DD" format, create date in UTC
      date = new Date(dateStr + 'T00:00:00.000Z')
    }
    
    if (!isValid(date)) return dateStr
    
    // Use Intl.DateTimeFormat for timezone conversion
    const userTimezone = timezone || getUserTimezone()
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: userTimezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    return formatter.format(date)
  } catch {
    return dateStr
  }
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return ""
  
  try {
    // If it's just time (HH:MM), create a temporary date to format it
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      return format(date, "HH:mm")
    }
    
    // If it's a full datetime string, extract just the time
    const date = parseISO(timeStr)
    if (!isValid(date)) return timeStr
    
    return format(date, "HH:mm")
  } catch {
    return timeStr
  }
}

export function getCurrentDateTimeForForm(): { date: string; time: string } {
  const now = new Date()
  
  return {
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm")
  }
}

export function getCurrentDateForForm(): string {
  return format(new Date(), "yyyy-MM-dd")
}

export function combineDateAndTime(date: string, time: string): string {
  if (!date) return ""
  if (!time) return date
  
  // Extract just the date part if it's already an ISO datetime string
  let dateOnly = date
  if (date.includes('T')) {
    dateOnly = date.split('T')[0]
  }
  
  // Handle time format - if it already has seconds, don't add more
  let timeFormatted = time
  if (time && !time.includes(':00:00') && time.match(/^\d{2}:\d{2}$/)) {
    timeFormatted = `${time}:00`
  } else if (time && time.includes(':00:00')) {
    // Remove the extra :00 if it exists
    timeFormatted = time.replace(':00:00', ':00')
  }
  
  return `${dateOnly}T${timeFormatted}`
}

// Convert datetime from stored format to user's configured timezone for form input
export function convertFromAppToLocal(appDateTime: string, userTimezone?: string): string {
  if (!appDateTime) return ""
  
  try {
    // Use the user's configured timezone
    const timezone = userTimezone || getUserTimezone()
    
    // Parse the datetime from storage (assumed to be in São Paulo timezone)
    const appDate = new Date(appDateTime)
    
    // Convert to user's timezone using Intl.DateTimeFormat
    const userTimeString = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(appDate)
    
    // Format for datetime-local input
    const [datePart, timePart] = userTimeString.split(' ')
    return `${datePart}T${timePart}`
  } catch {
    return appDateTime
  }
}

// Convert datetime from user's configured timezone to storage format
export function convertFromLocalToApp(localDateTime: string, userTimezone?: string): string {
  if (!localDateTime) return ""
  
  try {
    // Use the user's configured timezone
    const timezone = userTimezone || getUserTimezone()
    
    // Parse the datetime-local input as if it's in the user's timezone
    // We need to create a proper date object that represents this time in the user's timezone
    
    // Create a temporary date to get timezone offset
    const tempDate = new Date()
    const userOffset = new Date(tempDate.toLocaleString('sv-SE', { timeZone: timezone })).getTime() - 
                       new Date(tempDate.toLocaleString('sv-SE', { timeZone: 'UTC' })).getTime()
    
    // Parse the local datetime and adjust for timezone
    const localDate = new Date(localDateTime)
    const adjustedDate = new Date(localDate.getTime() - userOffset)
    
    // Return ISO string for storage
    return adjustedDate.toISOString().slice(0, 19)
  } catch {
    return localDateTime
  }
}

// Legacy functions for backward compatibility - use the new timezone-aware versions
export function convertFromSaoPauloToLocal(saoPauloDateTime: string): string {
  return convertFromAppToLocal(saoPauloDateTime, 'America/Sao_Paulo')
}

export function convertFromLocalToSaoPaulo(localDateTime: string): string {
  return convertFromLocalToApp(localDateTime, 'America/Sao_Paulo')
}

// Format date for chart display with locale support
export function formatDateForChart(dateStr: string, t: any): string {
  if (!dateStr) return ""
  
  try {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    
    // Check if it's today or yesterday
    if (date.toDateString() === today.toDateString()) {
      return t('today') || 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday') || 'Yesterday'
    } else {
      // Use locale-aware date formatting for other dates
      return date.toLocaleDateString(getDateLocale(), { 
        weekday: 'short',
        day: '2-digit'
      })
    }
  } catch {
    return dateStr
  }
}