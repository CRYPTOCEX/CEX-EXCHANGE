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

// Define Tailwind color palette (extend as needed)
export const tailwindColors = {
  red: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  orange: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  amber: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  yellow: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  lime: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  green: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  emerald: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  teal: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  cyan: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  sky: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  blue: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  indigo: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  violet: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  purple: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  fuchsia: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  pink: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  rose: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  slate: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  gray: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  zinc: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  neutral: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
  stone: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ],
};

// Special colors
const specialColors = {
  white: "white",
  black: "black",
  transparent: "transparent",
};

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

// Map hex values to approximate Tailwind colors (simplified)
const hexToTailwindMap: Record<string, string> = {
  "#ffffff": "white",
  "#000000": "black",
  "#f8fafc": "slate-50",
  "#f1f5f9": "slate-100",
  "#e2e8f0": "slate-200",
  "#cbd5e1": "slate-300",
  "#94a3b8": "slate-400",
  "#64748b": "slate-500",
  "#475569": "slate-600",
  "#334155": "slate-700",
  "#1e293b": "slate-800",
  "#0f172a": "slate-900",
  // ... add more mappings as needed
};

// Reverse mapping for display
const tailwindToHexMap: Record<string, string> = Object.entries(
  hexToTailwindMap
).reduce(
  (acc, [hex, tailwind]) => {
    acc[tailwind] = hex;
    return acc;
  },
  {} as Record<string, string>
);

// Helper function: compute the complementary shade
export function getComplementaryShade(
  colorName: string,
  shade: string
): string {
  if (
    !colorName ||
    !shade ||
    !tailwindColors[colorName as keyof typeof tailwindColors]
  ) {
    return shade;
  }
  const shades = tailwindColors[colorName as keyof typeof tailwindColors];
  const index = shades.indexOf(shade);
  if (index === -1) return shade;
  // Flip index: complementary shade is at (last index - current index)
  return shades[shades.length - 1 - index];
}

// Function to parse a Tailwind color class and extract name and shade
export function parseTailwindColor(colorClass: string): {
  colorName: string;
  shade: string;
} | null {
  if (!colorClass || typeof colorClass !== "string") return null;
  if (
    colorClass === "white" ||
    colorClass === "black" ||
    colorClass === "transparent"
  ) {
    return {
      colorName: colorClass,
      shade: "",
    };
  }
  const parts = colorClass.split("-");
  if (parts.length < 2) return null;
  if (parts.length === 2) {
    return {
      colorName: parts[0],
      shade: parts[1],
    };
  }
  if (parts.length === 3 && parts[0] === "bg") {
    return {
      colorName: parts[1],
      shade: parts[2],
    };
  }
  return null;
}

// Helper to compute a complementary color class from a Tailwind color
export function getComplementaryColor(tailwindClass: string): string {
  const parsed = parseTailwindColor(tailwindClass);
  if (parsed) {
    const { colorName, shade } = parsed;
    const complementaryShade = getComplementaryShade(colorName, shade);
    return `${colorName}-${complementaryShade}`;
  }
  return tailwindClass;
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
  const { theme, setTheme } = useTheme();
  const [selectedColor, setSelectedColor] = useState<string>("transparent");
  const [selectedTailwindClass, setSelectedTailwindClass] =
    useState<string>("transparent");
  const [baseColor, setBaseColor] = useState<string | null>(null);
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
  const [gradientFrom, setGradientFrom] = useState<string>("blue-500");
  const [gradientVia, setGradientVia] = useState<string | undefined>(undefined);
  const [gradientTo, setGradientTo] = useState<string>("purple-500");
  const [useVia, setUseVia] = useState<boolean>(false);

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
      const gradientClass = `bg-gradient-${gradientDirection} from-${gradientFrom} ${useVia && gradientVia ? `via-${gradientVia}` : ""} to-${gradientTo}`;
      setSelectedTailwindClass(gradientClass);
      setCurrentColor({
        type: "gradient",
        value: gradientClass,
        gradient: gradientValue,
      });
    } else if (typeof value === "object" && "light" in value) {
      setColorType("solid");
      const lightValue = value.light;
      const darkValue = value.dark || getComplementaryColor(lightValue);
      const currentThemeValue = theme === "dark" ? darkValue : lightValue;
      setSelectedTailwindClass(currentThemeValue);
      setSelectedColor(
        tailwindToHexMap[currentThemeValue] || currentThemeValue
      );
      setCurrentColor({
        type: "solid",
        value: currentThemeValue,
        light: lightValue,
        dark: darkValue,
      });
    } else if (typeof value === "string") {
      setColorType("solid");
      setSelectedColor(value);
      setSelectedTailwindClass(hexToTailwindMap[value] || value);
      setCurrentColor({
        type: "solid",
        value: value,
      });
    }
  }, [value, theme]);
  const handleBaseColorSelect = (colorName: string) => {
    setBaseColor(colorName);
  };
  const handleShadeSelect = (shade: string) => {
    const tailwindClass = `${baseColor}-${shade}`;
    return tailwindClass;
  };
  const handleColorSelect = (color: string, tailwindClass: string) => {
    setSelectedColor(color);
    setSelectedTailwindClass(tailwindClass);
    if (
      tailwindClass === "white" ||
      tailwindClass === "black" ||
      tailwindClass === "transparent"
    ) {
      onChange(tailwindClass, tailwindClass, tailwindClass, false, null);
      setCurrentColor({
        type: "solid",
        value: tailwindClass,
      });
      return;
    }
    const parsedColor = parseTailwindColor(tailwindClass);
    if (parsedColor) {
      const { colorName, shade } = parsedColor;
      const complementaryShade = getComplementaryShade(colorName, shade);
      const oppositeThemeClass = `${colorName}-${complementaryShade}`;
      onChange(tailwindClass, oppositeThemeClass, tailwindClass, false, null);
      setCurrentColor({
        type: "solid",
        value: tailwindClass,
        light: tailwindClass,
        dark: oppositeThemeClass,
      });
    } else {
      onChange(color, color, tailwindClass, false, null);
      setCurrentColor({
        type: "solid",
        value: tailwindClass,
      });
    }
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
    const createComplementaryGradientColor = (colorClass: string) => {
      const parsedColor = parseTailwindColor(colorClass);
      if (parsedColor) {
        const { colorName, shade } = parsedColor;
        const complementaryShade = getComplementaryShade(colorName, shade);
        return `${colorName}-${complementaryShade}`;
      }
      return colorClass;
    };
    const fromComplementary = createComplementaryGradientColor(gradientFrom);
    const viaComplementary = gradientVia
      ? createComplementaryGradientColor(gradientVia)
      : undefined;
    const toComplementary = createComplementaryGradientColor(gradientTo);
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
    const gradientClass = `bg-gradient-${gradientDirection} from-${gradientFrom} ${useVia && gradientVia ? `via-${gradientVia}` : ""} to-${gradientTo}`;
    setSelectedTailwindClass(gradientClass);
    onChange("", "", gradientClass, true, gradientValue);
    setCurrentColor({
      type: "gradient",
      value: gradientClass,
      gradient: gradientValue,
    });
  };
  const getColorClass = (colorName: string, shade: string) =>
    `bg-${colorName}-${shade}`;
  const getSpecialColorClass = (colorName: string) => `bg-${colorName}`;
  const displayValue = () => {
    if (colorType === "gradient") {
      return `Gradient: ${gradientDirection} ${gradientFrom} to ${gradientTo}`;
    }
    if (typeof value === "object" && "light" in value) {
      return theme === "dark"
        ? value.dark || getComplementaryColor(value.light)
        : value.light;
    }
    return selectedTailwindClass;
  };
  const renderGradientPreview = () => {
    const gradientClass = `bg-gradient-${gradientDirection} from-${gradientFrom} ${useVia && gradientVia ? `via-${gradientVia}` : ""} to-${gradientTo}`;
    return <div className={cn("h-10 w-full rounded-md", gradientClass)}></div>;
  };
  const renderGradientColorSelector = (
    type: "from" | "via" | "to",
    currentValue: string
  ) => {
    return (
      <div className="space-y-1">
        <Label className="text-xs">
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Label>
        {baseColor === null ? (
          <div className="mb-3">
            <div className="grid grid-cols-5 gap-1">
              {Object.keys(tailwindColors).map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-8 rounded-sm border hover:ring-2 hover:ring-primary transition-colors flex flex-col items-center justify-center capitalize",
                    `bg-${color}-500`
                  )}
                  onClick={() => handleBaseColorSelect(color)}
                >
                  <span className="text-[10px] font-medium text-white">
                    {color}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBaseColor(null)}
              className="h-8 text-xs mb-2"
            >
              Back to Colors
            </Button>
            <h3 className="text-xs font-medium mb-2 capitalize">
              Select {baseColor} Shade
            </h3>
            <div className="grid grid-cols-5 gap-1">
              {tailwindColors[baseColor as keyof typeof tailwindColors].map(
                (shade) => (
                  <button
                    key={`${baseColor}-${shade}`}
                    className={cn(
                      "h-8 rounded-sm border hover:ring-2 hover:ring-primary transition-colors flex flex-col items-center justify-center",
                      selectedTailwindClass === `${baseColor}-${shade}` &&
                        "ring-2 ring-primary",
                      getColorClass(baseColor, shade)
                    )}
                    onClick={() => {
                      const tailwindClass = handleShadeSelect(shade);
                      if (type === "from") setGradientFrom(tailwindClass);
                      else if (type === "via") setGradientVia(tailwindClass);
                      else if (type === "to") setGradientTo(tailwindClass);
                    }}
                  >
                    <span className="text-[10px] font-medium">{shade}</span>
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    );
  };
  const toggleThemePreview = () =>
    setTheme(theme === "light" ? "dark" : "light");
  return (
    <div className="space-y-1.5 max-w-full">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-medium">
          {isHover ? `${label} (Hover)` : label}
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
              {colorType === "gradient" ? (
                <div
                  className={cn(
                    "h-5 w-5 rounded-sm border flex-shrink-0",
                    `bg-gradient-${gradientDirection} from-${gradientFrom} ${useVia && gradientVia ? `via-${gradientVia}` : ""} to-${gradientTo}`
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "h-5 w-5 rounded-sm border flex-shrink-0",
                    displayValue().startsWith("bg-")
                      ? displayValue()
                      : `bg-${displayValue()}`
                  )}
                />
              )}
              <span className="truncate text-xs">{displayValue()}</span>
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
                {baseColor === null ? (
                  <>
                    <div className="mb-3">
                      <h3 className="text-xs font-medium mb-2">Colors</h3>
                      <div className="grid grid-cols-5 gap-1">
                        {Object.keys(tailwindColors).map((color) => (
                          <button
                            key={color}
                            className={cn(
                              "h-8 rounded-sm border hover:ring-2 hover:ring-primary transition-colors flex flex-col items-center justify-center capitalize",
                              `bg-${color}-500`
                            )}
                            onClick={() => handleBaseColorSelect(color)}
                          >
                            <span className="text-[10px] font-medium text-white">
                              {color}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <h3 className="text-xs font-medium mb-2">Special</h3>
                      <div className="grid grid-cols-3 gap-1">
                        {Object.entries(specialColors).map(([name, value]) => (
                          <button
                            key={name}
                            className={cn(
                              "h-8 rounded-sm border hover:ring-2 hover:ring-primary transition-colors flex flex-col items-center justify-center",
                              selectedTailwindClass === name &&
                                "ring-2 ring-primary",
                              getSpecialColorClass(name)
                            )}
                            onClick={() =>
                              handleColorSelect(
                                tailwindToHexMap[name] || "#ffffff",
                                name
                              )
                            }
                          >
                            <span className="text-[10px] font-medium">
                              {name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBaseColor(null)}
                      className="h-8 text-xs mb-2"
                    >
                      Back to Colors
                    </Button>
                    <h3 className="text-xs font-medium mb-2 capitalize">
                      Select {baseColor} Shade
                    </h3>
                    <div className="grid grid-cols-5 gap-1">
                      {tailwindColors[
                        baseColor as keyof typeof tailwindColors
                      ].map((shade) => (
                        <button
                          key={`${baseColor}-${shade}`}
                          className={cn(
                            "h-8 rounded-sm border hover:ring-2 hover:ring-primary transition-colors flex flex-col items-center justify-center",
                            selectedTailwindClass === `${baseColor}-${shade}` &&
                              "ring-2 ring-primary",
                            getColorClass(baseColor, shade)
                          )}
                          onClick={() => {
                            const tailwindClass = handleShadeSelect(shade);
                            handleColorSelect("", tailwindClass);
                          }}
                        >
                          <span className="text-[10px] font-medium">
                            {shade}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
                        <SelectValue placeholder="Select direction" />
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
                      Use Via Color
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
                    Apply Gradient
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
