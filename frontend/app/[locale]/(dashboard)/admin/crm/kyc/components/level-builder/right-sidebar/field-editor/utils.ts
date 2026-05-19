export const getDefaultValidationValue = (type: string): any => {
  switch (type) {
    case "min":
      return 0;
    case "max":
      return 100;
    case "minLength":
      return 1;
    case "maxLength":
      return 100;
    case "pattern":
      return ".*";
    default:
      return "";
  }
};

export const getDefaultValidationMessage = (type: string): string => {
  switch (type) {
    case "min":
      return "Value must be at least {value}";
    case "max":
      return "Value must be at most {value}";
    case "minLength":
      return "Must be at least {value} characters";
    case "maxLength":
      return "Must be at most {value} characters";
    case "pattern":
      return "Value does not match the required pattern";
    default:
      return "Invalid value";
  }
};

// Get available validation types for the current field type
export const getAvailableValidationTypes = (fieldType: string): string[] => {
  switch (fieldType) {
    case "TEXT":
    case "EMAIL":
    case "PHONE":
    case "TEXTAREA":
      return ["minLength", "maxLength", "pattern"];
    case "NUMBER":
      return ["min", "max"];
    case "DATE":
      return ["min", "max"]; // For dates, min/max represent date ranges
    case "FILE":
      return ["maxLength"]; // For files, maxLength represents max file size
    default:
      return [];
  }
};

// Get fields that this field can depend on (fields that come before this one)
export const getAvailableConditionalFields = (
  allFields: KycField[],
  currentField: KycField
): KycField[] => {
  return allFields.filter(
    (f) =>
      typeof f.order === "number" &&
      currentField.order !== undefined &&
      f.order < currentField.order &&
      f.id !== currentField.id &&
      (f.type === "SELECT" ||
        f.type === "RADIO" ||
        f.type === "CHECKBOX" ||
        f.type === "TEXT" ||
        f.type === "NUMBER" ||
        f.type === "DATE")
  );
};
