import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import i18n from './i18n'

const APP_DEFAULT_TIMEZONE = 'America/Sao_Paulo'
const APP_STORAGE_TIMEZONE = 'UTC'

const timeZoneFormatterCache = new Map<string, Intl.DateTimeFormat>()

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

function getTimeZoneFormatter(timeZone: string): Intl.DateTimeFormat {
  if (!timeZoneFormatterCache.has(timeZone)) {
    timeZoneFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    )
  }

  return timeZoneFormatterCache.get(timeZone)!
}

function getTimeZoneOffsetForDate(date: Date, timeZone: string): number {
  const formatter = getTimeZoneFormatter(timeZone)
  const parts = formatter.formatToParts(date)
  let year = date.getUTCFullYear()
  let month = date.getUTCMonth() + 1
  let day = date.getUTCDate()
  let hour = date.getUTCHours()
  let minute = date.getUTCMinutes()
  let second = date.getUTCSeconds()

  for (const part of parts) {
    if (part.type === 'literal') continue
    const numericValue = Number(part.value)
    switch (part.type) {
      case 'year':
        year = numericValue
        break
      case 'month':
        month = numericValue
        break
      case 'day':
        day = numericValue
        break
      case 'hour':
        hour = numericValue
        break
      case 'minute':
        minute = numericValue
        break
      case 'second':
        second = numericValue
        break
      default:
        break
    }
  }

  const zonedTime = Date.UTC(year, month - 1, day, hour, minute, second)
  return zonedTime - date.getTime()
}

function parseDateTimeWithoutTimezone(dateTime: string): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} | null {
  const [datePart, timePart] = dateTime.split('T')
  if (!datePart || !timePart) return null

  const [yearStr, monthStr, dayStr] = datePart.split('-')
  const timeSegments = timePart.split(':')
  if (timeSegments.length < 2) return null

  const [hourStr, minuteStr, secondStrWithFraction] = timeSegments
  const [secondStr] = (secondStrWithFraction || '').split('.')

  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  const second = secondStr ? Number(secondStr) : 0

  const allNumbers = [year, month, day, hour, minute, second]
  if (allNumbers.some(Number.isNaN)) {
    return null
  }

  return { year, month, day, hour, minute, second }
}

function createDateInTimeZone(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string
): Date {
  const { year, month, day, hour, minute, second } = parts
  const naiveUtcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second))

  let offset = getTimeZoneOffsetForDate(naiveUtcDate, timeZone)
  let adjustedDate = new Date(naiveUtcDate.getTime() - offset)

  const recalculatedOffset = getTimeZoneOffsetForDate(adjustedDate, timeZone)
  if (recalculatedOffset !== offset) {
    adjustedDate = new Date(naiveUtcDate.getTime() - recalculatedOffset)
  }

  return adjustedDate
}

function formatDateForTimezone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const [datePart, timePart] = formatter.format(date).split(' ')
  return `${datePart}T${timePart}`
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
        const parsed = parseDateTimeWithoutTimezone(cleanedDateTimeStr)
        if (parsed) {
          date = createDateInTimeZone(parsed, APP_STORAGE_TIMEZONE)
        } else {
          // Fallback to interpreting as UTC
          date = new Date(cleanedDateTimeStr + 'Z')
        }
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
        const parsed = parseDateTimeWithoutTimezone(dateStr)
        if (parsed) {
          date = createDateInTimeZone(parsed, APP_STORAGE_TIMEZONE)
        } else {
          // No timezone info, assume it's UTC
          date = new Date(dateStr + 'Z')
        }
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

export function getCurrentDateTimeForForm(timezone?: string): { date: string; time: string } {
  const targetTimezone = timezone || getUserTimezone()
  const localized = formatDateForTimezone(new Date(), targetTimezone)
  const [datePart, timePartWithSeconds] = localized.split('T')
  const timePart = timePartWithSeconds ? timePartWithSeconds.slice(0, 5) : '00:00'

  return {
    date: datePart,
    time: timePart
  }
}

export function getCurrentDateForForm(timezone?: string): string {
  const targetTimezone = timezone || getUserTimezone()
  const localized = formatDateForTimezone(new Date(), targetTimezone)
  const [datePart] = localized.split('T')
  return datePart
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
    
    const hasExplicitTimezone = /([+-]\d{2}:\d{2}|Z)$/i.test(appDateTime)
    let appDate: Date
    if (hasExplicitTimezone) {
      // ISO string with timezone information
      appDate = new Date(appDateTime)
    } else {
      const parsed = parseDateTimeWithoutTimezone(appDateTime)
      if (parsed) {
        // Interpret storage timestamps (without timezone) using the configured storage timezone
        appDate = createDateInTimeZone(parsed, APP_STORAGE_TIMEZONE)
      } else {
        appDate = new Date(appDateTime)
      }
    }
    
    const localized = formatDateForTimezone(appDate, timezone)
    return localized.slice(0, 16)
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
    
    const parsed = parseDateTimeWithoutTimezone(localDateTime)
    if (!parsed) return localDateTime

    const userDate = createDateInTimeZone(parsed, timezone)
    const storageFormatted = formatDateForTimezone(userDate, APP_STORAGE_TIMEZONE)
    
    return storageFormatted
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
