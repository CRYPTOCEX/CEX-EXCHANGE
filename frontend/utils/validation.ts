export type ValidationRule = {
  validate: (value: any) => boolean;
  message: string;
};

export type ValidationRules = ValidationRule[];

/**
 * Validates a value against a set of validation rules
 * @param value The value to validate
 * @param rules Array of validation rules to check
 * @returns Object containing validation result and error message
 */
export function validateValue(
  value: any,
  rules: ValidationRules
): { isValid: boolean; message: string } {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return { isValid: false, message: rule.message };
    }
  }
  return { isValid: true, message: "" };
}

/**
 * Common validation rules
 */
export const validationRules = {
  required: (message = "This field is required"): ValidationRule => ({
    validate: (value) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "number") return true;
      if (Array.isArray(value)) return value.length > 0;
      return !!value;
    },
    message,
  }),

  minLength: (
    length: number,
    message = `Must be at least ${length} characters`
  ): ValidationRule => ({
    validate: (value) => {
      if (typeof value !== "string") return true;
      return value.length >= length;
    },
    message,
  }),

  maxLength: (
    length: number,
    message = `Must be no more than ${length} characters`
  ): ValidationRule => ({
    validate: (value) => {
      if (typeof value !== "string") return true;
      return value.length <= length;
    },
    message,
  }),

  email: (message = "Please enter a valid email address"): ValidationRule => ({
    validate: (value) => {
      if (typeof value !== "string" || !value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  numeric: (message = "Must be a number"): ValidationRule => ({
    validate: (value) => {
      if (value === "" || value === undefined || value === null) return true;
      return !isNaN(Number(value));
    },
    message,
  }),

  min: (min: number, message = `Must be at least ${min}`): ValidationRule => ({
    validate: (value) => {
      if (value === "" || value === undefined || value === null) return true;
      return Number(value) >= min;
    },
    message,
  }),

  max: (
    max: number,
    message = `Must be no more than ${max}`
  ): ValidationRule => ({
    validate: (value) => {
      if (value === "" || value === undefined || value === null) return true;
      return Number(value) <= max;
    },
    message,
  }),

  pattern: (regex: RegExp, message = "Invalid format"): ValidationRule => ({
    validate: (value) => {
      if (typeof value !== "string" || !value) return true;
      return regex.test(value);
    },
    message,
  }),

  custom: (
    validateFn: (value: any) => boolean,
    message: string
  ): ValidationRule => ({
    validate: validateFn,
    message,
  }),
};
