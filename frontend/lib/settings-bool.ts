/**
 * Read a platform setting as a boolean.
 *
 * Settings come off the API as they are stored — TEXT — so an admin switch that
 * is OFF arrives as the **string** `"false"`, and `Boolean("false")` is `true`.
 * Several call sites coerced it that way and so could never see a switch turned
 * off: the blog's "enable author applications" is the one that surfaced it, where
 * closing the programme still showed the Apply link and the application form.
 *
 * Use this anywhere a settings value is treated as a switch. The backend has the
 * matching `CacheManager.getSettingBool`.
 *
 * `fallback` applies only when the value is absent, so a switch an admin has
 * never touched keeps the platform's intended default.
 */
export function settingIsTrue(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  if (value === null || value === undefined) return fallback;
  return Boolean(value);
}
