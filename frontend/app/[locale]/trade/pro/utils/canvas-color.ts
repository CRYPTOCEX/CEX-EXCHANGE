/**
 * Canvas colour helpers for the Pro workspace.
 *
 * The `--tp-*` palette used to hold plain hex, so every canvas in this tree
 * built its translucent gradient stops by APPENDING hex alpha to the computed
 * value: `` `${greenColor}66` ``. Those variables are now aliases onto the app's
 * design tokens, so `getPropertyValue("--tp-green")` computes to something like
 * `hsl(159 67% 45.1%)` — and `hsl(159 67% 45.1%)66` is not a colour.
 *
 * That is not a soft failure. `CanvasGradient.addColorStop()` THROWS a
 * SyntaxError on an unparseable colour, which takes out the whole draw call
 * and, with it, the panel. (`ctx.strokeStyle = <garbage>` is the soft version —
 * the assignment is ignored and the previous colour is silently reused.)
 *
 * `withAlpha` round-trips the colour through the canvas's own `fillStyle`
 * parser, which normalises ANY valid CSS colour to `#rrggbb` / `rgba(...)`, and
 * re-emits it at the requested alpha. Using the browser's parser means the
 * helper keeps working whatever syntax the tokens are expressed in next.
 *
 * Note it does NOT use `color-mix(… , transparent)`: colour interpolation is
 * premultiplied, so a 0% stop collapses to transparent BLACK and a gradient
 * fading out over a light panel picks up a grey fringe. Hex-alpha `…00` kept
 * the hue, and so does this.
 */
export function withAlpha(
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number
): string {
  const previous = ctx.fillStyle;
  ctx.fillStyle = color;
  const resolved = ctx.fillStyle;
  ctx.fillStyle = previous;

  if (typeof resolved !== "string") return color;

  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(resolved);
  if (hex) {
    return `rgba(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(
      hex[3],
      16
    )}, ${alpha})`;
  }

  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(resolved);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }

  // Unknown serialisation — better a solid stop than a thrown addColorStop.
  return resolved;
}

/**
 * Read a canvas colour off <html>, preferring the workspace token and falling
 * back to the CORE token it aliases. Re-read per draw so a theme toggle is
 * picked up without a remount.
 *
 * Canvas cannot use Tailwind classes, so every chart in this tree reads its
 * palette through `getComputedStyle`. Each one used to carry its own hex
 * fallback — `"#22c55e"`, `"#ef4444"`, `"#71717a"` — which is a second,
 * invisible palette: frozen to one theme, unreachable by the admin design
 * panel, and wrong the moment a site owner picks their own brand. Worse, a hex
 * fallback only ever appears when the token lookup FAILED, i.e. exactly when
 * the theme is not what the hex assumed.
 *
 * `--tp-*` is only in scope where `trade/pro` mounts (it is an optional
 * module), so `coreName` is the real backstop and is where the value comes from
 * on every other route. Core tokens hold bare HSL triples, hence the `hsl()`
 * wrap.
 */
export function themeColor(tpName: string, coreName: string): string {
  if (typeof window === "undefined") return "hsl(0 0% 50%)";
  const root = getComputedStyle(document.documentElement);
  const tp = root.getPropertyValue(tpName).trim();
  if (tp) return tp;
  const core = root.getPropertyValue(coreName).trim();
  // Last resort is achromatic on purpose: with no tokens in scope there is no
  // way to know which way the ground goes, and mid-grey is legible on both.
  return core ? `hsl(${core})` : "hsl(0 0% 50%)";
}
