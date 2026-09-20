/**
 * Calculates the profit amount based on investment amount and profit percentage
 * @param amount Investment amount
 * @param profitPercentage Profit percentage
 * @returns Calculated profit amount
 */
export const calculateProfit = (
  amount: number,
  profitPercentage: number
): number => {
  return amount * (profitPercentage / 100);
};

/**
 * Calculates the end date based on start date, duration, and timeframe
 * @param startDate Start date string
 * @param duration Duration value
 * @param timeframe Timeframe (HOUR, DAY, WEEK, MONTH)
 * @returns End date string
 */
export const calculateEndDate = (
  startDate: string,
  duration: number,
  timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH"
): string => {
  const date = new Date(startDate);

  switch (timeframe) {
    case "HOUR":
      date.setHours(date.getHours() + duration);
      break;
    case "DAY":
      date.setDate(date.getDate() + duration);
      break;
    case "WEEK":
      date.setDate(date.getDate() + duration * 7);
      break;
    case "MONTH":
      date.setMonth(date.getMonth() + duration);
      break;
  }

  return date.toISOString();
};

/**
 * Calculates the remaining time until the end date
 * @param endDate End date string
 * @returns Object with days, hours, minutes remaining
 */
export const calculateRemainingTime = (
  endDate: string
): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
} => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isExpired: false };
};
