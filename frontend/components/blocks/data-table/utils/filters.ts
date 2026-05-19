// Helper to determine if a value is "empty"
const isEmpty = (v: any): boolean => {
  if (v === undefined || v === null) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (
    typeof v === "object" &&
    "value" in v &&
    (v.value === undefined || v.value === null || v.value === "")
  )
    return true;
  return false;
};

// Helper to update filters object for a given key/value pair
export const updateFilters = (
  existing: Record<string, any>,
  key: string,
  value: any
): Record<string, any> => {
  const newFilters = { ...existing };
  if (isEmpty(value)) {
    delete newFilters[key];
  } else {
    newFilters[key] = value;
  }
  return newFilters;
};
