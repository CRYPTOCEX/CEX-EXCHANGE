// Types for country data
export interface Country {
  name: string;
  iso2: string;
  iso3: string;
  phonecode: string;
  hasStates: boolean;
}

export interface State {
  name: string;
  code: string | null;
  cities: string[];
}

export interface CountryData {
  name: string;
  iso2: string;
  iso3: string;
  phonecode: string;
  states: State[];
}

// Cache for loaded country data
const countryDataCache: Record<string, CountryData> = {};
let countriesIndex: Country[] | null = null;

// Load the countries index (async, fetches from JSON)
export async function loadCountriesIndex(): Promise<Country[]> {
  if (countriesIndex) {
    return countriesIndex;
  }

  try {
    const response = await fetch("/data/countries/_index.json");
    if (!response.ok) {
      throw new Error("Failed to load countries index");
    }
    countriesIndex = await response.json();
    return countriesIndex!;
  } catch (error) {
    console.error("Error loading countries index:", error);
    return [];
  }
}

// Load full country data (with states and cities)
export async function loadCountryData(
  countryCode: string
): Promise<CountryData | null> {
  const code = countryCode.toLowerCase();

  // Check cache
  if (countryDataCache[code]) {
    return countryDataCache[code];
  }

  try {
    const response = await fetch(`/data/countries/${code}.json`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    countryDataCache[code] = data;
    return data;
  } catch (error) {
    console.error(`Error loading country data for ${countryCode}:`, error);
    return null;
  }
}

// Get states for a country
export async function getStates(countryCode: string): Promise<State[]> {
  const data = await loadCountryData(countryCode);
  return data?.states || [];
}

// Get cities for a state within a country
export async function getCities(
  countryCode: string,
  stateName: string
): Promise<string[]> {
  const data = await loadCountryData(countryCode);
  if (!data) return [];

  const state = data.states.find(
    (s) => s.name === stateName || s.code === stateName
  );
  return state?.cities || [];
}

// Get phone code for a country (async)
export async function getPhoneCode(countryCode: string): Promise<string> {
  const countries = await loadCountriesIndex();
  const country = countries.find((c) => c.iso2 === countryCode);
  return country?.phonecode || "";
}

// Get country name by code (async)
export async function getCountryNameAsync(countryCode: string): Promise<string> {
  const countries = await loadCountriesIndex();
  const country = countries.find((c) => c.iso2 === countryCode);
  return country?.name || countryCode;
}

// Check if country has states data
export async function hasStatesData(countryCode: string): Promise<boolean> {
  const countries = await loadCountriesIndex();
  const country = countries.find((c) => c.iso2 === countryCode);
  return country?.hasStates || false;
}

// Synchronous helpers for use with pre-loaded data
export function getCountryNameSync(
  countries: Country[],
  countryCode: string
): string {
  const country = countries.find((c) => c.iso2 === countryCode);
  return country?.name || countryCode;
}

export function getPhoneCodeSync(
  countries: Country[],
  countryCode: string
): string {
  const country = countries.find((c) => c.iso2 === countryCode);
  return country?.phonecode || "";
}

// Format phone code with + prefix
export function formatPhoneCode(phonecode: string): string {
  if (!phonecode) return "";
  return phonecode.startsWith("+") ? phonecode : `+${phonecode}`;
}
