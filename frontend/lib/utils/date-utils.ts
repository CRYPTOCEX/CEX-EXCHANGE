/**
 * Centralized Date Formatting Utilities
 *
 * Provides consistent date/time formatting across the application.
 * Uses the user's locale and timezone for proper internationalization.
 */

/**
 * Format a date for display in the user's locale
 * @param date - Date object, ISO string, or timestamp
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatDate:', date);
    return 'Invalid Date';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat(undefined, defaultOptions).format(dateObj);
}

/**
 * Format a time for display in the user's locale
 * @param date - Date object, ISO string, or timestamp
 * @param includeSeconds - Whether to include seconds (default: false)
 * @returns Formatted time string
 */
export function formatTime(
  date: Date | string | number,
  includeSeconds: boolean = false
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatTime:', date);
    return 'Invalid Time';
  }

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
  };

  return new Intl.DateTimeFormat(undefined, options).format(dateObj);
}

/**
 * Format a date and time for display in the user's locale
 * @param date - Date object, ISO string, or timestamp
 * @param includeSeconds - Whether to include seconds (default: false)
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | string | number,
  includeSeconds: boolean = false
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatDateTime:', date);
    return 'Invalid Date/Time';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
  };

  return new Intl.DateTimeFormat(undefined, options).format(dateObj);
}

/**
 * Format date for compact display (e.g., "Jan 15" for current year, "Jan 15, 2024" for other years)
 * @param date - Date object, ISO string, or timestamp
 * @returns Compact formatted date string
 */
export function formatDateCompact(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatDateCompact:', date);
    return 'Invalid Date';
  }

  const now = new Date();
  const isSameYear = dateObj.getFullYear() === now.getFullYear();

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...((!isSameYear) && { year: 'numeric' }),
  };

  return new Intl.DateTimeFormat(undefined, options).format(dateObj);
}

/**
 * Format time remaining until a future date
 * @param futureDate - Future date object, ISO string, or timestamp
 * @returns Formatted time remaining string (e.g., "2h 15m", "45s")
 */
export function formatTimeRemaining(futureDate: Date | string | number): string {
  const future = typeof futureDate === 'string' || typeof futureDate === 'number'
    ? new Date(futureDate)
    : futureDate;

  if (isNaN(future.getTime())) {
    console.warn('Invalid date provided to formatTimeRemaining:', futureDate);
    return 'Invalid';
  }

  const now = new Date();
  const diff = future.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format time remaining in MM:SS format
 * @param futureDate - Future date object, ISO string, or timestamp
 * @returns Formatted countdown string (e.g., "02:15", "00:45")
 */
export function formatCountdown(futureDate: Date | string | number): string {
  const future = typeof futureDate === 'string' || typeof futureDate === 'number'
    ? new Date(futureDate)
    : futureDate;

  if (isNaN(future.getTime())) {
    console.warn('Invalid date provided to formatCountdown:', futureDate);
    return '00:00';
  }

  const now = new Date();
  const diff = future.getTime() - now.getTime();

  if (diff <= 0) {
    return '00:00';
  }

  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "1h 30m", "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) {
    console.warn('Negative duration provided to formatDuration:', minutes);
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatRelativeTime:', date);
    return 'Invalid Date';
  }

  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return formatDate(dateObj);
  } else if (days > 0) {
    return diff < 0 ? `${days} day${days > 1 ? 's' : ''} ago` : `in ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return diff < 0 ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return diff < 0 ? `${minutes} minute${minutes > 1 ? 's' : ''} ago` : `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return diff < 0 ? `${seconds} second${seconds !== 1 ? 's' : ''} ago` : `in ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}

/**
 * Check if a date is today
 * @param date - Date object, ISO string, or timestamp
 * @returns true if date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    dateObj.getDate() === now.getDate() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getFullYear() === now.getFullYear()
  );
}

/**
 * Check if a date is in the past
 * @param date - Date object, ISO string, or timestamp
 * @returns true if date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  return dateObj.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 * @param date - Date object, ISO string, or timestamp
 * @returns true if date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  return dateObj.getTime() > Date.now();
}

/**
 * Format date for binary trading chart labels (HH:MM format)
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted chart label
 */
export function formatChartLabel(date: Date | string | number): string {
  return formatTime(date, false);
}

/**
 * Format date for trade history (e.g., "Jan 15, 10:30 AM")
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted trade history string
 */
export function formatTradeHistory(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat(undefined, options).format(dateObj);
}

/**
 * Parse an ISO date string safely
 * @param isoString - ISO 8601 date string
 * @returns Date object or null if invalid
 */
export function parseISODate(isoString: string): Date | null {
  try {
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Get start of day for a given date
 * @param date - Date object, ISO string, or timestamp (optional, defaults to now)
 * @returns Date object set to start of day (00:00:00.000)
 */
export function startOfDay(date?: Date | string | number): Date {
  const dateObj = date
    ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date)
    : new Date();

  const start = new Date(dateObj);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get end of day for a given date
 * @param date - Date object, ISO string, or timestamp (optional, defaults to now)
 * @returns Date object set to end of day (23:59:59.999)
 */
export function endOfDay(date?: Date | string | number): Date {
  const dateObj = date
    ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date)
    : new Date();

  const end = new Date(dateObj);
  end.setHours(23, 59, 59, 999);
  return end;
}
