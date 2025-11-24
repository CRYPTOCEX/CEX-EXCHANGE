export const getEndDate = (
  duration: number,
  timeframe: string,
  startDate: Date = new Date()
): Date => {
  switch (timeframe) {
    case "HOUR":
      startDate.setHours(startDate.getHours() + duration);
      break;
    case "DAY":
      startDate.setDate(startDate.getDate() + duration);
      break;
    case "WEEK":
      startDate.setDate(startDate.getDate() + duration * 7);
      break;
    case "MONTH":
      startDate.setMonth(startDate.getMonth() + duration);
      break;
  }

  return startDate;
};
