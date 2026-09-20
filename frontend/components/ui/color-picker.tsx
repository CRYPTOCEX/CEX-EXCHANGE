"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";



// Gradient directions
const gradientDirections = [
  {
    value: "to-t",
    label: "To Top",
  },
  {
    value: "to-tr",
    label: "To Top Right",
  },
  {
    value: "to-r",
    label: "To Right",
  },
  {
    value: "to-br",
    label: "To Bottom Right",
  },
  {
    value: "to-b",
    label: "To Bottom",
  },
  {
    value: "to-bl",
    label: "To Bottom Left",
  },
  {
    value: "to-l",
    label: "To Left",
  },
  {
    value: "to-tl",
    label: "To Top Left",
  },
  {
    value: "radial",
    label: "Radial",
  },
];

/**
 * The colours this picker offers.
 *
 * It used to offer the raw Tailwind palette — 22 hues x 11 shades — and build
 * each swatch as `bg-${colorName}-${shade}`. Two things were wrong with that:
 *
 *  1. Tailwind emits only classes it has SEEN in source, and an interpolated
 *     class name is never seen. So a swatch painted only when some unrelated
 *     file happened to use that exact class. Measured against the compiled
 *     stylesheet: the red/violet 500 steps were alive, because the exempt
 *     gateway checkout skins happen to use them, while lime-300, fuchsia-800,
 *     teal-950, stone-50, rose-400 and sky-700 were all dead. Most of the grid
 *     was invisible buttons, and which ones depended on unrelated files.
 *
 *  2. It was dead END TO END. Whatever an admin picked was stored as page
 *     content and rendered by the builder as `bg-${value}` — equally
 *     unsafelisted, so the page did not paint it either. Making the swatches
 *     visible would only have made a broken feature look like it worked.
 *
 * So the picker now offers the design system's tokens, which are exactly the
 * values the builder's `tailwindSafelist` (see
 * `app/[locale]/(dashboard)/admin/builder/templates/utils.ts`) can actually
 * render. Every entry's `value` appears verbatim in that safelist. Add one here
 * and you MUST add the matching class there, or it will silently stop painting.
 *
 * Swatches preview via `css` as an inline style, never as a class, so the
 * preview can no longer depend on what other files happen to use — and the
 * tokens follow the theme, so the picker shows true colours in both modes.
 */
export interface DesignTokenSwatch {
  /** Emitted value. The renderers build `bg-${value}` / `text-${value}`. */
  value: string;
  label: string;
  /** Real CSS, for the inline-style preview. */
  css: string;
}

export const surfaceTokens: DesignTokenSwatch[] = [
  { value: "[hsl(var(--background))]", label: "Background", css: "hsl(var(--background))" },
  { value: "[hsl(var(--card))]", label: "Card", css: "hsl(var(--card))" },
  { value: "[hsl(var(--card)/0.72)]", label: "Card 72%", css: "hsl(var(--card) / 0.72)" },
  { value: "[hsl(var(--surface-2))]", label: "Surface 2", css: "hsl(var(--surface-2))" },
  { value: "[hsl(var(--surface-3))]", label: "Surface 3", css: "hsl(var(--surface-3))" },
  { value: "[hsl(var(--popover))]", label: "Popover", css: "hsl(var(--popover))" },
  { value: "[hsl(var(--primary))]", label: "Primary", css: "hsl(var(--primary))" },
  { value: "[hsl(var(--primary)/0.10)]", label: "Primary 10%", css: "hsl(var(--primary) / 0.10)" },
  { value: "[hsl(var(--success))]", label: "Success", css: "hsl(var(--success))" },
  { value: "[hsl(var(--warning))]", label: "Warning", css: "hsl(var(--warning))" },
  { value: "[hsl(var(--destructive))]", label: "Destructive", css: "hsl(var(--destructive))" },
  { value: "[hsl(var(--info))]", label: "Info", css: "hsl(var(--info))" },
  { value: "[hsl(var(--chart-4))]", label: "Accent", css: "hsl(var(--chart-4))" },
  { value: "transparent", label: "None", css: "transparent" },
];

/** Ink emits BARE token names — the renderer builds `text-card-foreground`. */
export const inkTokens: DesignTokenSwatch[] = [
  { value: "card-foreground", label: "Body", css: "hsl(var(--card-foreground))" },
  { value: "muted-foreground", label: "Muted", css: "hsl(var(--muted-foreground))" },
  { value: "subtle-foreground", label: "Subtle", css: "hsl(var(--subtle-foreground))" },
  { value: "primary-foreground", label: "On primary", css: "hsl(var(--primary-foreground))" },
  { value: "[hsl(var(--background))]", label: "On dark", css: "hsl(var(--background))" },
  { value: "[hsl(var(--primary))]", label: "Primary", css: "hsl(var(--primary))" },
  { value: "[hsl(var(--success))]", label: "Success", css: "hsl(var(--success))" },
  { value: "[hsl(var(--warning))]", label: "Warning", css: "hsl(var(--warning))" },
  { value: "[hsl(var(--destructive))]", label: "Destructive", css: "hsl(var(--destructive))" },
  { value: "[hsl(var(--info))]", label: "Info", css: "hsl(var(--info))" },
  { value: "[hsl(var(--chart-4))]", label: "Accent", css: "hsl(var(--chart-4))" },
];

/** `colorVariable` tells us whether this instance paints a surface or ink. */
export function tokensFor(colorVariable: string): DesignTokenSwatch[] {
  return /text|icon/i.test(colorVariable) ? inkTokens : surfaceTokens;
}

/** Preview any stored value, whether it is a token fragment or a bare token. */
export function swatchCss(value: string | undefined): string {
  if (!value || value === "transparent") return "transparent";
  const known = [...surfaceTokens, ...inkTokens].find((t) => t.value === value);
  if (known) return known.css;
  // `[hsl(var(--x))]` / `[hsl(var(--x)/0.5)]` -> the CSS inside the brackets
  const arb = value.match(/^\[(.+)\]$/);
  if (arb) return arb[1].replace(/\/(?=[\d.])/, " / ");
  // a bare token name, e.g. `muted-foreground`
  if (/^[a-z][a-z0-9-]*$/.test(value)) return `hsl(var(--${value}))`;
  return "transparent";
}





export interface GradientValue {
  direction: string;
  from: string;
  via?: string;
  to: string;
  light?: {
    direction: string;
    from: string;
    via?: string;
    to: string;
  };
  dark?: {
    direction: string;
    from: string;
    via?: string;
    to: string;
  };
}
interface ColorPickerProps {
  label: string;
  colorVariable: string;
  value?:
    | string
    | {
        light: string;
        dark?: string;
      }
    | {
        type: "gradient";
        gradient: GradientValue;
      };
  onChange: (
    lightColor: string,
    darkColor: string,
    tailwindClass: string,
    isGradient?: boolean,
    gradientValue?: GradientValue | null
  ) => void;
  isHover?: boolean;
  disabled?: boolean;
}
export function ColorPicker({
  label,
  colorVariable,
  value,
  onChange,
  isHover = false,
  disabled = false,
}: ColorPickerProps) {
  const tComponents = useTranslations("components");
  const tCommon = useTranslations("common");
  const t = useTranslations("components");
  const { theme, setTheme } = useTheme();
  const [selectedColor, setSelectedColor] = useState<string>("transparent");
  const [selectedTailwindClass, setSelectedTailwindClass] =
    useState<string>("transparent");
  const [colorType, setColorType] = useState<"solid" | "gradient">("solid");
  const [currentColor, setCurrentColor] = useState<{
    type: "solid" | "gradient";
    value: string;
    light?: string;
    dark?: string;
    gradient?: GradientValue;
  }>({
    type: "solid",
    value: "transparent",
  });

  // Gradient state
  const [gradientDirection, setGradientDirection] = useState<string>("to-r");
  /* Were `blue-500` / `purple-500` — palette names this design system does not
     emit, so a freshly-opened gradient defaulted to two colours that painted
     nothing. Tokens instead, and they are in `tailwindSafelist`. */
  const [gradientFrom, setGradientFrom] = useState<string>("[hsl(var(--primary))]");
  const [gradientVia, setGradientVia] = useState<string | undefined>(undefined);
  const [gradientTo, setGradientTo] = useState<string>("[hsl(var(--chart-4))]");
  const [useVia, setUseVia] = useState<boolean>(false);

  /**
   * A stable identifier for the current gradient.
   *
   * This used to be built as `bg-gradient-${dir} from-${from} to-${to}` — a
   * string shaped like a Tailwind class but assembled at runtime, so it was
   * never emitted. Worse, it looked enough like a class that the renderers
   * would try to apply it. Gradients are painted from the `GradientValue`
   * object via `gradientToCss` (a real inline `linear-gradient`), so this value
   * is only an identifier; making it obviously NOT a class name stops anything
   * downstream mistaking it for one.
   */
  const gradientDescriptor = () =>
    `gradient:${gradientDirection}:${gradientFrom}:${useVia && gradientVia ? gradientVia : ""}:${gradientTo}`;

  // Initialize color value
  useEffect(() => {
    if (!value) {
      setSelectedColor("transparent");
      setSelectedTailwindClass("transparent");
      setColorType("solid");
      setCurrentColor({
        type: "solid",
        value: "transparent",
      });
      return;
    }
    if (
      typeof value === "object" &&
      "type" in value &&
      value.type === "gradient"
    ) {
      setColorType("gradient");
      const gradientValue = value.gradient;
      const currentThemeGradient =
        theme === "dark" && gradientValue.dark
          ? gradientValue.dark
          : theme === "light" && gradientValue.light
            ? gradientValue.light
            : gradientValue;
      setGradientDirection(currentThemeGradient.direction);
      setGradientFrom(currentThemeGradient.from);
      setGradientVia(currentThemeGradient.via);
      setUseVia(!!currentThemeGradient.via);
      setGradientTo(currentThemeGradient.to);
      const gradientClass = gradientDescriptor();
      setSelectedTailwindClass(gradientClass);
      setCurrentColor({
        type: "gradient",
        value: gradientClass,
        gradient: gradientValue,
      });
    } else if (typeof value === "object" && "light" in value) {
      setColorType("solid");
      /**
       * Stored content may still carry a `{light, dark}` pair from before
       * tokens. `light` is the one to show: a token already resolves per theme,
       * so the two halves are the same value for anything picked since. The
       * previous code branched on `theme === "dark"`, which is additionally
       * wrong for anyone on "system" — next-themes reports the literal string
       * "system" there, never "dark".
       */
      const lightValue = value.light;
      setSelectedTailwindClass(lightValue);
      setSelectedColor(swatchCss(lightValue));
      setCurrentColor({
        type: "solid",
        value: lightValue,
        light: lightValue,
        dark: value.dark || lightValue,
      });
    } else if (typeof value === "string") {
      setColorType("solid");
      setSelectedColor(swatchCss(value));
      setSelectedTailwindClass(value);
      setCurrentColor({
        type: "solid",
        value: value,
      });
    }
  }, [value, theme]);
  /**
   * Emit a chosen value. There is no light/dark fork any more: the old version
   * derived the dark half by flipping the shade index (`slate-100` ->
   * `slate-900`), which invented a colour the admin never picked and is exactly
   * the per-theme duplication tokens exist to remove.
   */
  const handleColorSelect = (color: string, tokenValue: string) => {
    setSelectedColor(color);
    setSelectedTailwindClass(tokenValue);
    onChange(tokenValue, tokenValue, tokenValue, false, null);
    setCurrentColor({
      type: "solid",
      value: tokenValue,
      light: tokenValue,
      dark: tokenValue,
    });
  };
  const handleGradientColorChange = (
    type: "from" | "via" | "to",
    colorClass: string
  ) => {
    if (type === "from") setGradientFrom(colorClass);
    else if (type === "via") setGradientVia(colorClass);
    else if (type === "to") setGradientTo(colorClass);
  };
  const applyGradient = () => {
    /**
     * The dark half of the gradient is the SAME as the light half.
     *
     * It used to be derived by flipping each stop's shade index — `blue-200`
     * became `blue-900` — which invented a gradient nobody chose and could not
     * work anyway, since neither class was ever emitted. Every stop is now a
     * token, and a token already resolves per theme, so one definition covers
     * both and the two halves cannot drift apart.
     */
    const fromComplementary = gradientFrom;
    const viaComplementary = gradientVia;
    const toComplementary = gradientTo;
    const lightGradient = {
      direction: gradientDirection,
      from: gradientFrom,
      ...(useVia && gradientVia
        ? {
            via: gradientVia,
          }
        : {}),
      to: gradientTo,
    };
    const darkGradient = {
      direction: gradientDirection,
      from: fromComplementary,
      ...(useVia && viaComplementary
        ? {
            via: viaComplementary,
          }
        : {}),
      to: toComplementary,
    };
    const gradientValue: GradientValue = {
      ...lightGradient,
      light: lightGradient,
      dark: darkGradient,
    };
    const gradientClass = gradientDescriptor();
    setSelectedTailwindClass(gradientClass);
    onChange("", "", gradientClass, true, gradientValue);
    setCurrentColor({
      type: "gradient",
      value: gradientClass,
      gradient: gradientValue,
    });
  };
  /** The tokens this instance offers, chosen by what it paints. */
  const tokens = tokensFor(colorVariable);
  /**
   * Selecting a token. `light`/`dark` are the same value on purpose: a token
   * IS theme-aware, so forking it per theme is exactly the redundancy the
   * design system's R5 removes — and the old complementary-shade guess
   * (`slate-100` -> `slate-900`) produced colours nobody chose.
   */
  const selectToken = (token: DesignTokenSwatch) => {
    setSelectedColor(token.css);
    setSelectedTailwindClass(token.value);
    setColorType("solid");
    setCurrentColor({ type: "solid", value: token.value, light: token.value, dark: token.value });
    onChange(token.value, token.value, token.value, false, null);
  };
  /**
   * The trigger shows the token's NAME ("Card", "Primary 10%") rather than the
   * raw stored value, which is now an arbitrary-value fragment like
   * `[hsl(var(--card))]` — accurate but unreadable in a 200px-wide control.
   *
   * The old version also branched on `theme === "dark"` to show a per-theme
   * value. Tokens are theme-aware by definition, so there is only one value to
   * show, and that branch was additionally wrong for anyone on "system" — where
   * next-themes reports the literal string "system", never "dark".
   */
  const displayLabel = () => {
    if (colorType === "gradient") {
      const from = tokens.find((t) => t.value === gradientFrom)?.label ?? "…";
      const to = tokens.find((t) => t.value === gradientTo)?.label ?? "…";
      return `Gradient: ${from} → ${to}`;
    }
    const token = tokens.find((t) => t.value === selectedTailwindClass);
    return token ? token.label : selectedTailwindClass || tCommon("no_grouping");
  };
  /**
   * The gradient preview paints with a real `linear-gradient`, not
   * `bg-gradient-${dir} from-${x}` — those four interpolated classes were
   * never emitted, so this preview was always an empty box.
   */
  const GRADIENT_ANGLE: Record<string, string> = {
    "to-t": "to top", "to-tr": "to top right", "to-r": "to right",
    "to-br": "to bottom right", "to-b": "to bottom", "to-bl": "to bottom left",
    "to-l": "to left", "to-tl": "to top left",
  };
  const gradientCss = () => {
    const stops = [swatchCss(gradientFrom)];
    if (useVia && gradientVia) stops.push(swatchCss(gradientVia));
    stops.push(swatchCss(gradientTo));
    if (gradientDirection === "radial") {
      return `radial-gradient(circle, ${stops.join(", ")})`;
    }
    return `linear-gradient(${GRADIENT_ANGLE[gradientDirection] ?? "to right"}, ${stops.join(", ")})`;
  };
  const renderGradientPreview = () => (
    <div className="h-10 w-full rounded-md border" style={{ background: gradientCss() }} />
  );

  /** One flat grid of tokens — no base-colour/shade drill-down to get lost in. */
  const renderTokenGrid = (
    current: string | undefined,
    onPick: (token: DesignTokenSwatch) => void
  ) => (
    <div className="grid grid-cols-4 gap-1.5">
      {tokens.map((token) => (
        <button
          key={token.value}
          type="button"
          title={token.label}
          onClick={() => onPick(token)}
          className={cn(
            "flex h-12 flex-col items-center justify-end gap-1 rounded-sm border p-1 transition-colors hover:ring-2 hover:ring-primary",
            current === token.value && "ring-2 ring-primary"
          )}
          style={{ background: token.css }}
        >
          {/* The label sits on its own chip rather than directly on the swatch:
              the swatch IS an arbitrary colour, so no single ink colour is
              guaranteed to be readable on it. */}
          <span className="w-full truncate rounded-xs bg-card/85 px-1 text-[9px] font-medium leading-4 text-card-foreground">
            {token.label}
          </span>
        </button>
      ))}
    </div>
  );

  const renderGradientColorSelector = (
    type: "from" | "via" | "to",
    currentValue: string
  ) => (
    <div className="space-y-1">
      <Label className="text-xs">
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Label>
      {renderTokenGrid(currentValue, (token) => {
        if (type === "from") setGradientFrom(token.value);
        else if (type === "via") setGradientVia(token.value);
        else setGradientTo(token.value);
      })}
    </div>
  );
  const toggleThemePreview = () =>
    setTheme(theme === "light" ? "dark" : "light");
  return (
    <div className="space-y-1.5 max-w-full">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-medium">
          {isHover ? tComponents("hover", { label: String(label) }) : label}
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleThemePreview}
          className="h-6 w-6 p-0"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-2 w-full">
              {/* Inline style, not `bg-${value}` — the swatch has to preview an
                  arbitrary stored value, and a constructed class never compiles. */}
              <div
                className="h-5 w-5 rounded-sm border flex-shrink-0"
                style={{
                  background:
                    colorType === "gradient"
                      ? gradientCss()
                      : swatchCss(selectedTailwindClass),
                }}
              />
              <span className="truncate text-xs">{displayLabel()}</span>
              {disabled && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Locked
                </span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        {!disabled && (
          <PopoverContent className="w-64 p-0" align="start" side="right">
            <Tabs
              defaultValue={colorType}
              onValueChange={(value) =>
                setColorType(value as "solid" | "gradient")
              }
            >
              <TabsList className="w-full">
                <TabsTrigger value="solid" className="flex-1">
                  Solid
                </TabsTrigger>
                <TabsTrigger value="gradient" className="flex-1">
                  Gradient
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="solid"
                className="p-3 max-h-[300px] overflow-y-auto"
              >
                {renderTokenGrid(selectedTailwindClass, selectToken)}
              </TabsContent>
              <TabsContent
                value="gradient"
                className="p-3 max-h-[300px] overflow-y-auto"
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Direction</Label>
                    <Select
                      value={gradientDirection}
                      onValueChange={setGradientDirection}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder={t("select_direction")} />
                      </SelectTrigger>
                      <SelectContent>
                        {gradientDirections.map((direction) => (
                          <SelectItem
                            key={direction.value}
                            value={direction.value}
                          >
                            {direction.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {renderGradientColorSelector("from", gradientFrom)}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useVia"
                      checked={useVia}
                      onChange={(e) => setUseVia(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="useVia" className="text-xs">
                      {t("use_via_color")}
                    </Label>
                  </div>
                  {useVia &&
                    renderGradientColorSelector(
                      "via",
                      gradientVia || "purple-400"
                    )}
                  {renderGradientColorSelector("to", gradientTo)}
                  <div className="mt-2">
                    <Label className="text-xs mb-1 block">Preview</Label>
                    {renderGradientPreview()}
                  </div>
                  <Button
                    className="w-full mt-2"
                    size="sm"
                    onClick={applyGradient}
                  >
                    {t("apply_gradient")}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
