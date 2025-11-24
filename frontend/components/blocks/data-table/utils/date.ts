import { format, parseISO } from "date-fns";

export const formatDate = (
  date: string,
  formatString: string = "PPP"
): string => {
  try {
    return format(parseISO(date), formatString);
  } catch (error) {
    console.error("Error formatting date:", error);
    return date;
  }
};
