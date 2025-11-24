// Time synchronization utilities

// For testing use this time offset to match the chart time
// This simulates getting the correct time that matches the chart display
// const TIME_OFFSET_MS = -5 * 60 * 60 * 1000; // -5 hours in milliseconds

// Get chart-synchronized time
export function getChartSynchronizedTime(): Date {
  // In a real implementation, this would sync with the chart's time reference
  // For now, we'll just use the current time
  // return new Date(Date.now() + TIME_OFFSET_MS);
  return new Date();
}

// Format time for display in chart
export function formatChartTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Calculate the next expiry time based on interval
export function calculateNextExpiryTime(intervalMinutes: number): Date {
  const now = getChartSynchronizedTime();
  const minutes = now.getMinutes();
  const remainder = minutes % intervalMinutes;

  const nextExpiryTime = new Date(now);
  if (remainder === 0) {
    // If we're exactly at an interval, use the next one
    nextExpiryTime.setMinutes(minutes + intervalMinutes);
  } else {
    // Otherwise round up to the next interval
    nextExpiryTime.setMinutes(minutes + (intervalMinutes - remainder));
  }
  nextExpiryTime.setSeconds(0);
  nextExpiryTime.setMilliseconds(0);

  return nextExpiryTime;
}

// Format time as countdown (MM:SS)
export function formatCountdown(timeLeftMs: number): string {
  if (timeLeftMs <= 0) return "00:00";

  const minutes = Math.floor(timeLeftMs / 60000);
  const seconds = Math.floor((timeLeftMs % 60000) / 1000);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Convert a Date to Unix timestamp (seconds)
export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

// Convert Unix timestamp (seconds) to Date
export function unixTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
