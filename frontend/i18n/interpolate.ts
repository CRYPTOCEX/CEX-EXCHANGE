/**
 * Translation Interpolation Utilities
 *
 * Handles variable substitution in translation strings.
 * Supports: {variable}, {count, plural, ...}, {date, ...}
 */

/**
 * Simple interpolation - replaces {key} with values from params
 * @param template - Translation string with {placeholders}
 * @param params - Key-value pairs for substitution
 * @returns Interpolated string
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params || !template) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in params) {
      return String(params[key]);
    }
    return match; // Keep original if no replacement found
  });
}

/**
 * ICU-lite plural handling
 * Supports basic plural forms: zero, one, two, few, many, other
 * Format: {count, plural, one {# item} other {# items}}
 */
export function handlePlural(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params || !template.includes(", plural,")) return template;

  return template.replace(
    /\{(\w+),\s*plural,\s*([^}]+)\}/g,
    (match, countKey, forms) => {
      const count = params[countKey];
      if (count === undefined) return match;

      const numCount = Number(count);
      const formMap: Record<string, string> = {};

      // Parse plural forms: one {text} other {text}
      const formRegex = /(\w+)\s*\{([^}]*)\}/g;
      let formMatch;
      while ((formMatch = formRegex.exec(forms)) !== null) {
        formMap[formMatch[1]] = formMatch[2];
      }

      // Select appropriate form
      let selectedForm = formMap.other || "";
      if (numCount === 0 && formMap.zero) {
        selectedForm = formMap.zero;
      } else if (numCount === 1 && formMap.one) {
        selectedForm = formMap.one;
      } else if (numCount === 2 && formMap.two) {
        selectedForm = formMap.two;
      }

      // Replace # with actual count
      return selectedForm.replace(/#/g, String(numCount));
    }
  );
}

