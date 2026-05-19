import { COUNTRY_OPTIONS } from "@/utils/countries";

// Predefined field templates for common KYC fields
export const FIELD_PRESETS = {
  country: {
    type: "SELECT" as KycFieldType,
    label: "Country of Residence",
    description: "Select the country where you currently reside",
    required: true,
    options: COUNTRY_OPTIONS,
  },
  countryOfBirth: {
    type: "SELECT" as KycFieldType,
    label: "Country of Birth",
    description: "Select the country where you were born",
    required: false,
    options: COUNTRY_OPTIONS,
  },
  nationality: {
    type: "SELECT" as KycFieldType,
    label: "Nationality",
    description: "Select your nationality",
    required: false,
    options: COUNTRY_OPTIONS,
  },
  citizenship: {
    type: "SELECT" as KycFieldType,
    label: "Citizenship",
    description: "Select your citizenship",
    required: false,
    options: COUNTRY_OPTIONS,
  }
};

// Function to detect if a field should use country options based on its label
export const shouldUseCountryOptions = (label: string): boolean => {
  const countryKeywords = [
    'country',
    'nationality',
    'citizenship',
    'residence',
    'birth place',
    'place of birth',
    'born in',
    'citizen of'
  ];
  
  const lowercaseLabel = label.toLowerCase();
  return countryKeywords.some(keyword => lowercaseLabel.includes(keyword));
};

// Function to apply country options to a field if appropriate
export const applyCountryOptionsIfNeeded = (field: Partial<KycField>): Partial<KycField> => {
  if (field.type === "SELECT" && field.label && shouldUseCountryOptions(field.label)) {
    return {
      ...field,
      options: COUNTRY_OPTIONS
    };
  }
  return field;
}; 