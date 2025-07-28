/**
 * Date range utilities for generating continuous chart data
 */

export type TimeframeType = 'weekly' | 'monthly' | 'yearly';

/**
 * Generates a continuous date range with zero values for missing dates
 * @param timeframe The timeframe type
 * @param existingData Array of existing data points with date property
 * @returns Array of data points with all dates filled in
 */
export function generateContinuousDateRange<T extends Record<string, any>>(
  timeframe: TimeframeType,
  existingData: T[] = []
): (T & { date: string })[] {
  const now = new Date();
  const dates: Date[] = [];
  
  // Generate date range based on timeframe
  switch (timeframe) {
    case 'weekly': {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push(date);
      }
      break;
    }
    case 'monthly': {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push(date);
      }
      break;
    }
    case 'yearly': {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        date.setDate(1); // First day of month for monthly granularity
        dates.push(date);
      }
      break;
    }
  }

  // Format dates based on timeframe
  const formatDate = (date: Date): string => {
    switch (timeframe) {
      case 'weekly':
      case 'monthly':
        // Daily format: YYYY-MM-DD
        return date.toISOString().split('T')[0];
      case 'yearly':
        // Monthly format: YYYY-MM
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  };

  // Create a map of existing data by date
  const existingDataMap = new Map<string, T>();
  existingData.forEach(item => {
    // Try to extract date from various possible properties
    const dateValue = item.date || item.period || item.month || item.week || item.day;
    if (dateValue) {
      // Normalize the date format to match our generated dates
      const normalizedDate = normalizeDateString(dateValue, timeframe);
      if (normalizedDate) {
        existingDataMap.set(normalizedDate, item);
      }
    }
  });

  // Generate continuous data with zero values for missing dates
  return dates.map(date => {
    const dateStr = formatDate(date);
    const existingItem = existingDataMap.get(dateStr);
    
    if (existingItem) {
      // Return existing data with normalized date
      return {
        ...existingItem,
        date: dateStr
      } as T & { date: string };
    } else {
      // Create zero-filled entry for missing date with only the necessary properties
      const zeroEntry: Record<string, any> = {
        date: dateStr
      };

      // Only add properties that might be expected based on the data structure
      if (existingData.length > 0) {
        const sampleItem = existingData[0];
        Object.keys(sampleItem).forEach(key => {
          if (key !== 'date' && key !== 'period' && key !== 'month' && key !== 'week' && key !== 'day') {
            // Set numeric properties to 0, keep other properties undefined
            if (typeof sampleItem[key] === 'number') {
              zeroEntry[key] = 0;
            }
          }
        });
      } else {
        // Fallback for common properties
        zeroEntry.views = 0;
        zeroEntry.positive = 0;
        zeroEntry.negative = 0;
        zeroEntry.count = 0;
        zeroEntry.value = 0;
      }

      return zeroEntry as T & { date: string };
    }
  });
}

/**
 * Normalizes date strings from various formats to a consistent format
 * @param dateStr The date string to normalize
 * @param timeframe The timeframe context
 * @returns Normalized date string
 */
function normalizeDateString(dateStr: string, timeframe: TimeframeType): string {
  if (!dateStr) return '';

  // Handle various date formats
  if (dateStr.includes('T')) {
    // ISO format: 2024-01-15T00:00:00.000Z
    const datePart = dateStr.split('T')[0];
    if (timeframe === 'yearly') {
      // Convert to YYYY-MM format for yearly
      return datePart.substring(0, 7);
    }
    return datePart;
  }
  
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Already in YYYY-MM-DD format
    if (timeframe === 'yearly') {
      // Convert to YYYY-MM format for yearly
      return dateStr.substring(0, 7);
    }
    return dateStr;
  }
  
  if (dateStr.match(/^\d{4}-\d{2}$/)) {
    // YYYY-MM format
    if (timeframe === 'yearly') {
      return dateStr; // Already in correct format for yearly
    } else {
      // For daily/weekly, we need to convert to a specific day
      // We'll use the first day of the month
      return `${dateStr}-01`;
    }
  }
  
  // Try to parse as date and format appropriately
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      if (timeframe === 'yearly') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        return date.toISOString().split('T')[0];
      }
    }
  } catch (e) {
    // If parsing fails, return empty string
    console.warn('Failed to parse date string:', dateStr);
  }
  
  return '';
}

/**
 * Fills missing dates in time series data with zero values
 * @param data Array of data points with date property  
 * @param timeframe The timeframe type
 * @returns Array with all missing dates filled with zeros
 */
export function fillMissingDates<T extends Record<string, any>>(
  data: T[],
  timeframe: TimeframeType
): T[] {
  return generateContinuousDateRange(timeframe, data);
}

/**
 * Gets the appropriate date format label for chart display
 * @param timeframe The timeframe type
 * @returns Format label string
 */
export function getDateFormatLabel(timeframe: TimeframeType): string {
  switch (timeframe) {
    case 'weekly':
      return '(Daily)';
    case 'monthly':
      return '(Weekly)';
    case 'yearly':
      return '(Monthly)';
    default:
      return '';
  }
}

/**
 * Gets the timeframe indicator for KPI cards
 * @param timeframe The timeframe type
 * @returns Single character indicator
 */
export function getTimeframeIndicator(timeframe: TimeframeType): 'd' | 'm' | 'y' {
  switch (timeframe) {
    case 'weekly':
      return 'd';
    case 'monthly':
      return 'm';
    case 'yearly':
      return 'y';
    default:
      return 'm';
  }
} 