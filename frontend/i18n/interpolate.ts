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
 * Scan forward from the index of an opening brace to its MATCHING close.
 *
 * Returns the index of the closing brace, or -1 if the template is unbalanced.
 * Plural form bodies nest (`one {# of {total}}`), so brace matching has to
 * count depth — the reason this is not a regex.
 */
function matchBrace(template: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < template.length; i++) {
    if (template[i] === "{") depth++;
    else if (template[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Parse the body of a plural argument into its selector → form map.
 *
 * Body looks like `=0 {No owners} one {# owner} other {# owners}`. Selectors are
 * a plural category (`zero`/`one`/`two`/`few`/`many`/`other`) or an ICU exact
 * match (`=0`, `=1`, ...).
 */
function parsePluralForms(body: string): Record<string, string> {
  const forms: Record<string, string> = {};
  let i = 0;

  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++;
    if (i >= body.length) break;

    const selectorStart = i;
    while (i < body.length && !/[\s{]/.test(body[i])) i++;
    const selector = body.slice(selectorStart, i);
    if (!selector) break;

    while (i < body.length && /\s/.test(body[i])) i++;
    if (body[i] !== "{") break;

    const close = matchBrace(body, i);
    if (close === -1) break;

    forms[selector] = body.slice(i + 1, close);
    i = close + 1;
  }

  return forms;
}

/**
 * ICU-lite plural handling.
 *
 * Format: `{count, plural, one {# item} other {# items}}`, with `=N` exact
 * matches and the CLDR categories zero/one/two/few/many/other.
 *
 * THIS IS A BRACE-MATCHING PARSER, NOT A REGEX. The regex it replaces was
 * `\{(\w+),\s*plural,\s*([^}]+)\}` — `[^}]+` stops at the first `}`, which is
 * the one closing the FIRST form. So `{count, plural, one {# key} other {# keys}}`
 * matched only up to `one {# key}`, the form parser then found no complete
 * `selector {body}` pair inside the truncated slice, and the whole argument
 * rendered as the empty string followed by the untouched remainder — every
 * plural message on the platform displayed as literal ` other {# keys}}`.
 *
 * The category is chosen by `Intl.PluralRules` for the ACTIVE locale rather
 * than by comparing the number to 1 and 2. Those comparisons are English rules
 * wearing CLDR names: they can never select `few` or `many`, so Russian,
 * Polish and Arabic messages could only ever resolve to `other`.
 */
export function handlePlural(
  template: string,
  params?: Record<string, string | number>,
  locale?: string
): string {
  if (!params || !template.includes(", plural,")) return template;

  let out = "";
  let cursor = 0;
  const argPattern = /\{(\w+),\s*plural,\s*/g;
  let match: RegExpExecArray | null;

  while ((match = argPattern.exec(template)) !== null) {
    const argStart = match.index;
    if (argStart < cursor) continue; // inside a form body already consumed

    const close = matchBrace(template, argStart);
    if (close === -1) break; // unbalanced - leave the remainder verbatim

    out += template.slice(cursor, argStart);

    const count = params[match[1]];
    if (count === undefined) {
      out += template.slice(argStart, close + 1);
    } else {
      const numCount = Number(count);
      const forms = parsePluralForms(template.slice(match.index + match[0].length, close));

      let selected = forms[`=${numCount}`];
      if (selected === undefined) {
        selected = forms[selectCategory(numCount, locale)];
      }
      if (selected === undefined) selected = forms.other ?? "";

      out += selected.replace(/#/g, String(numCount));
    }

    cursor = close + 1;
    argPattern.lastIndex = cursor;
  }

  return out + template.slice(cursor);
}

/**
 * The CLDR plural category for a number in a locale, with a safe fallback.
 *
 * `Intl.PluralRules` throws on a malformed locale tag, and a translation string
 * is not worth taking a render down for.
 */
function selectCategory(value: number, locale?: string): string {
  if (!Number.isFinite(value)) return "other";
  try {
    return new Intl.PluralRules(locale || "en").select(value);
  } catch {
    return new Intl.PluralRules("en").select(value);
  }
}

