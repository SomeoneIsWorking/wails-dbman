import { formatDistanceToNow, format } from 'date-fns'

/**
 * Formats a date into a human-readable relative time string (e.g. "2 hours ago")
 * or a localized date string if the date is older than 24 hours
 */
export function formatRelativeDate(date: Date | string | null): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  
  // If less than 24 hours, show relative time
  if (diff < 86400000) {
    return formatDistanceToNow(dateObj, { addSuffix: true })
  }
  
  // Otherwise show localized date
  return format(dateObj, 'PP')
} 