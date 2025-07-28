"use client";
import type {
  Section,
  Row,
  Column,
  ColorValue,
  Element,
} from "@/types/builder";
import type React from "react";
import type { JSX } from "react";
import { cn } from "@/lib/utils";
import ElementRenderer from "./elements";
import { useTheme } from "next-themes";
import { getStructureStyle } from "../utils";
import { useTranslations } from "next-intl";

// Define proper types for settings
interface SectionSettings {
  backgroundColor?: ColorValue;
  backgroundImage?: string;
  backgroundOverlay?: ColorValue | string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginBottom?: number;
  [key: string]: any;
}

interface RowSettings {
  maxWidth?: string;
  backgroundColor?: ColorValue;
  padding?: number;
  margin?: number;
  gutter?: number;
  verticalAlign?: "top" | "middle" | "bottom";
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  hoverBackgroundColor?: ColorValue;
  [key: string]: any;
}

interface ColumnSettings {
  backgroundColor?: ColorValue;
  padding?: number;
  border?: string;
  borderRadius?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  hoverBackgroundColor?: ColorValue;
  hoverBorderColor?: ColorValue;
  borderWidth?: number;
  borderColor?: ColorValue;
  [key: string]: any;
}

interface ElementSettings {
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  [key: string]: any;
}

// Type guards for color objects
interface ThemeColor {
  light?: string;
  dark?: string;
  type?: never;
}

interface GradientDefinition {
  direction?: string;
  from?: string;
  via?: string;
  to?: string;
  dark?: GradientDefinition;
  light?: GradientDefinition;
}

interface GradientColor {
  type: "gradient";
  gradient: GradientDefinition;
}

// Type guards
const isGradientColor = (color: any): color is GradientColor => {
  return (
    typeof color === "object" &&
    color !== null &&
    "type" in color &&
    color.type === "gradient"
  );
};

const isThemeColor = (color: any): color is ThemeColor => {
  return typeof color === "object" && color !== null && !("type" in color);
};

interface SectionRendererProps {
  section: Section;
  isPreview?: boolean;
}

export default function SectionRenderer({
  section,
  isPreview = false,
}: SectionRendererProps) {
  const t = useTranslations("dashboard");
  const { theme } = useTheme();

  // Early validation to prevent null/undefined errors
  if (!section || typeof section !== "object") {
    console.warn("SectionRenderer: Invalid section provided:", section);
    return (
      <div className="p-4 text-center text-red-500">
        {t("invalid_section_data")}
      </div>
    );
  }

  if (!section.rows || !Array.isArray(section.rows)) {
    console.warn("SectionRenderer: Section missing rows array:", section);
    return (
      <div className="p-4 text-center text-yellow-600">
        {t("section_has_no_content")}
      </div>
    );
  }

  const settings = (section.settings as SectionSettings) || {};

  // Helper function to get theme-aware color
  const getThemeColor = (
    colorValue: ColorValue | undefined
  ): string | undefined => {
    if (!colorValue) return undefined;

    // If it's a theme object with light/dark values
    if (isThemeColor(colorValue) && colorValue.light && colorValue.dark) {
      return theme === "dark" ? colorValue.dark : colorValue.light;
    }

    // Otherwise return the color as is
    return typeof colorValue === "string" ? colorValue : undefined;
  };

  // Helper function to get gradient classes
  const getGradientClasses = (
    gradientValue: GradientDefinition | undefined,
    prefix = ""
  ): string[] => {
    if (!gradientValue) return [];

    // Get the appropriate theme version
    const currentGradient =
      theme === "dark" && gradientValue.dark
        ? gradientValue.dark
        : theme === "light" && gradientValue.light
          ? gradientValue.light
          : gradientValue;

    const direction = currentGradient.direction || "to-r";
    const from = currentGradient.from || "blue-500";
    const to = currentGradient.to || "purple-500";

    const classes = [
      `${prefix}bg-gradient-${direction}`,
      `${prefix}from-${from}`,
      currentGradient.via ? `${prefix}via-${currentGradient.via}` : "",
      `${prefix}to-${to}`,
    ];

    return classes.filter(Boolean);
  };

  // Update the getBackgroundStyles function to ensure it's not applying inline styles for Tailwind classes
  const getBackgroundStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    // Handle background color if it's not a gradient or Tailwind class
    if (settings.backgroundColor) {
      if (isThemeColor(settings.backgroundColor)) {
        // It's a theme-aware color object but not a gradient
        // Only apply as inline style if it's not a Tailwind class
        const themeColor = getThemeColor(settings.backgroundColor);
        if (themeColor && !themeColor.includes("-")) {
          styles.backgroundColor = themeColor;
        }
      } else if (
        typeof settings.backgroundColor === "string" &&
        !settings.backgroundColor.includes("-")
      ) {
        // It's a direct color value that's not a Tailwind class
        styles.backgroundColor = settings.backgroundColor;
      }
    }

    if (settings.backgroundImage) {
      styles.backgroundImage = `url(${settings.backgroundImage})`;
      styles.backgroundSize = "cover";
      styles.backgroundPosition = "center";
    }

    return styles;
  };

  const getContainerClass = (): string => {
    // Apply consistent container classes for both edit and preview modes
    switch (section.type) {
      case "fullwidth":
        return "w-full";
      case "specialty":
        return "max-w-7xl mx-auto px-4";
      case "regular":
      default:
        return "max-w-6xl mx-auto px-4";
    }
  };

  const renderRow = (row: Row): JSX.Element => {
    // Validate row data
    if (!row || typeof row !== "object") {
      console.warn("SectionRenderer: Invalid row provided:", row);
      return (
        <div className="p-2 text-center text-red-500">
          {t("invalid_row_data")}
        </div>
      );
    }

    if (!row.columns || !Array.isArray(row.columns)) {
      console.warn("SectionRenderer: Row missing columns array:", row);
      return (
        <div className="p-2 text-center text-yellow-600">
          {t("row_has_no_columns")}
        </div>
      );
    }

    const rowSettings = (row.settings as RowSettings) || {};
    const rowStyles: React.CSSProperties = {
      ...getStructureStyle(rowSettings, "row"),
    };

    // Handle background color if it's not a gradient and not a Tailwind class
    if (rowSettings.backgroundColor) {
      if (isThemeColor(rowSettings.backgroundColor)) {
        const themeColor = getThemeColor(rowSettings.backgroundColor);
        if (themeColor && !themeColor.includes("-")) {
          rowStyles.backgroundColor = themeColor;
        }
      } else if (
        typeof rowSettings.backgroundColor === "string" &&
        !rowSettings.backgroundColor.includes("-")
      ) {
        rowStyles.backgroundColor = rowSettings.backgroundColor;
      }
    }

    if (rowSettings.paddingTop)
      rowStyles.paddingTop = `${rowSettings.paddingTop}px`;
    if (rowSettings.paddingRight)
      rowStyles.paddingRight = `${rowSettings.paddingRight}px`;
    if (rowSettings.paddingBottom)
      rowStyles.paddingBottom = `${rowSettings.paddingBottom}px`;
    if (rowSettings.paddingLeft)
      rowStyles.paddingLeft = `${rowSettings.paddingLeft}px`;

    // Determine the classes for the row - match ResizableStructure classes
    const rowClasses = [
      "row-container",
      "relative",
      "transition-all",
      "duration-200",
      "box-border",
      "flex",
      "flex-wrap",
      "w-full",
    ];

    // Handle Tailwind background color classes
    if (rowSettings.backgroundColor) {
      if (isGradientColor(rowSettings.backgroundColor)) {
        // It's a gradient
        rowClasses.push(
          ...getGradientClasses(rowSettings.backgroundColor.gradient)
        );
      } else if (isThemeColor(rowSettings.backgroundColor)) {
        // It's a theme-aware Tailwind color
        if (
          theme === "light" &&
          rowSettings.backgroundColor.light?.includes("-")
        ) {
          rowClasses.push(`bg-${rowSettings.backgroundColor.light}`);
        }
        if (
          theme === "dark" &&
          rowSettings.backgroundColor.dark?.includes("-")
        ) {
          rowClasses.push(`dark:bg-${rowSettings.backgroundColor.dark}`);
        }
      } else if (
        typeof rowSettings.backgroundColor === "string" &&
        rowSettings.backgroundColor.includes("-")
      ) {
        // It's a direct Tailwind class
        rowClasses.push(`bg-${rowSettings.backgroundColor}`);
      }
    }

    // Handle hover background color
    if (rowSettings.hoverBackgroundColor) {
      if (isGradientColor(rowSettings.hoverBackgroundColor)) {
        // It's a gradient - add hover: prefix to each gradient class
        const hoverGradientClasses = getGradientClasses(
          rowSettings.hoverBackgroundColor.gradient,
          "hover:"
        );
        rowClasses.push(...hoverGradientClasses);
      } else if (isThemeColor(rowSettings.hoverBackgroundColor)) {
        // It's a theme-aware Tailwind color
        if (
          theme === "light" &&
          rowSettings.hoverBackgroundColor.light?.includes("-")
        ) {
          rowClasses.push(`hover:bg-${rowSettings.hoverBackgroundColor.light}`);
        }
        if (
          theme === "dark" &&
          rowSettings.hoverBackgroundColor.dark?.includes("-")
        ) {
          rowClasses.push(
            `hover:dark:bg-${rowSettings.hoverBackgroundColor.dark}`
          );
        }
      } else if (
        typeof rowSettings.hoverBackgroundColor === "string" &&
        rowSettings.hoverBackgroundColor.includes("-")
      ) {
        // It's a direct Tailwind class
        rowClasses.push(`hover:bg-${rowSettings.hoverBackgroundColor}`);
      }
    }

    // Handle vertical alignment
    if (rowSettings.verticalAlign) {
      switch (rowSettings.verticalAlign) {
        case "top":
          rowClasses.push("items-start");
          break;
        case "middle":
          rowClasses.push("items-center");
          break;
        case "bottom":
          rowClasses.push("items-end");
          break;
      }
    }

    return (
      <div style={rowStyles} className={cn(...rowClasses)}>
        {row.columns
          .filter((column) => column && typeof column === "object")
          .map((column, index) => (
            <div
              key={column.id}
              className="relative"
              style={{
                width: `${column.width.toFixed(2)}%`,
                paddingLeft: rowSettings.gutter
                  ? `${rowSettings.gutter / 2}px`
                  : undefined,
                paddingRight: rowSettings.gutter
                  ? `${rowSettings.gutter / 2}px`
                  : undefined,
              }}
            >
              {renderColumn(column, rowSettings.gutter || 0, index)}
            </div>
          ))}
      </div>
    );
  };

  // Update the renderColumn function to better handle hover states
  const renderColumn = (
    column: Column,
    gutter: number,
    index: number
  ): JSX.Element => {
    // Validate column data
    if (!column || typeof column !== "object") {
      console.warn("SectionRenderer: Invalid column provided:", column);
      return (
        <div className="p-2 text-center text-red-500">
          {t("invalid_column_data")}
        </div>
      );
    }

    const processedInlineElements = new Set<number>();
    const columnSettings = (column.settings as ColumnSettings) || {};
    const columnStyles: React.CSSProperties = {
      ...getStructureStyle(columnSettings, "column"),
    };

    // Handle background color if it's not a gradient and not a Tailwind class
    if (columnSettings.backgroundColor) {
      if (isThemeColor(columnSettings.backgroundColor)) {
        const themeColor = getThemeColor(columnSettings.backgroundColor);
        if (themeColor && !themeColor.includes("-")) {
          columnStyles.backgroundColor = themeColor;
        }
      } else if (
        typeof columnSettings.backgroundColor === "string" &&
        !columnSettings.backgroundColor.includes("-")
      ) {
        columnStyles.backgroundColor = columnSettings.backgroundColor;
      }
    }

    if (columnSettings.paddingTop)
      columnStyles.paddingTop = `${columnSettings.paddingTop}px`;
    if (columnSettings.paddingRight)
      columnStyles.paddingRight = `${columnSettings.paddingRight}px`;
    if (columnSettings.paddingBottom)
      columnStyles.paddingBottom = `${columnSettings.paddingBottom}px`;
    if (columnSettings.paddingLeft)
      columnStyles.paddingLeft = `${columnSettings.paddingLeft}px`;

    // Determine the classes for the column - match ResizableStructure classes
    const columnClasses = [
      "column-container",
      "relative",
      "transition-all",
      "duration-200",
      "box-border",
    ];

    // Handle Tailwind background color classes
    if (columnSettings.backgroundColor) {
      if (isGradientColor(columnSettings.backgroundColor)) {
        // It's a gradient
        columnClasses.push(
          ...getGradientClasses(columnSettings.backgroundColor.gradient)
        );
      } else if (isThemeColor(columnSettings.backgroundColor)) {
        // It's a theme-aware Tailwind color
        if (
          theme === "light" &&
          columnSettings.backgroundColor.light?.includes("-")
        ) {
          columnClasses.push(`bg-${columnSettings.backgroundColor.light}`);
        }
        if (
          theme === "dark" &&
          columnSettings.backgroundColor.dark?.includes("-")
        ) {
          columnClasses.push(`dark:bg-${columnSettings.backgroundColor.dark}`);
        }
      } else if (
        typeof columnSettings.backgroundColor === "string" &&
        columnSettings.backgroundColor.includes("-")
      ) {
        // It's a direct Tailwind class
        columnClasses.push(`bg-${columnSettings.backgroundColor}`);
      }
    }

    // Handle hover background color - only if the type matches the base background color type
    if (columnSettings.hoverBackgroundColor) {
      const isBaseGradient = isGradientColor(columnSettings.backgroundColor);
      const isHoverGradient = isGradientColor(
        columnSettings.hoverBackgroundColor
      );

      // Only apply hover background if types match (both gradient or both solid)
      if (isBaseGradient === isHoverGradient) {
        if (isGradientColor(columnSettings.hoverBackgroundColor)) {
          // It's a gradient - add hover: prefix to each gradient class
          const hoverGradientClasses = getGradientClasses(
            columnSettings.hoverBackgroundColor.gradient,
            "hover:"
          );
          columnClasses.push(...hoverGradientClasses);
        } else if (isThemeColor(columnSettings.hoverBackgroundColor)) {
          // It's a theme-aware Tailwind color
          if (
            theme === "light" &&
            columnSettings.hoverBackgroundColor.light?.includes("-")
          ) {
            columnClasses.push(
              `hover:bg-${columnSettings.hoverBackgroundColor.light}`
            );
          }
          if (
            theme === "dark" &&
            columnSettings.hoverBackgroundColor.dark?.includes("-")
          ) {
            columnClasses.push(
              `hover:dark:bg-${columnSettings.hoverBackgroundColor.dark}`
            );
          }
        } else if (
          typeof columnSettings.hoverBackgroundColor === "string" &&
          columnSettings.hoverBackgroundColor.includes("-")
        ) {
          // It's a direct Tailwind class
          columnClasses.push(`hover:bg-${columnSettings.hoverBackgroundColor}`);
        }
      }
    }

    // Handle hover border color - only if the type matches the base border color type
    if (
      columnSettings.borderWidth &&
      columnSettings.borderWidth > 0 &&
      columnSettings.hoverBorderColor
    ) {
      const isBaseGradient = isGradientColor(columnSettings.borderColor);
      const isHoverGradient = isGradientColor(columnSettings.hoverBorderColor);

      // Only apply hover border if types match (both gradient or both solid)
      if (isBaseGradient === isHoverGradient) {
        if (isGradientColor(columnSettings.hoverBorderColor)) {
          // For gradient borders on hover, we need a special approach
          columnClasses.push("hover:border-transparent hover:relative");
          // We'll handle this with a pseudo-element in a separate class
        } else if (isThemeColor(columnSettings.hoverBorderColor)) {
          // It's a theme-aware Tailwind color
          if (
            theme === "light" &&
            columnSettings.hoverBorderColor.light?.includes("-")
          ) {
            columnClasses.push(
              `hover:border-${columnSettings.hoverBorderColor.light}`
            );
          }
          if (
            theme === "dark" &&
            columnSettings.hoverBorderColor.dark?.includes("-")
          ) {
            columnClasses.push(
              `hover:dark:border-${columnSettings.hoverBorderColor.dark}`
            );
          }
        } else if (
          typeof columnSettings.hoverBorderColor === "string" &&
          columnSettings.hoverBorderColor.includes("-")
        ) {
          // It's a direct Tailwind class
          columnClasses.push(`hover:border-${columnSettings.hoverBorderColor}`);
        }
      }
    }

    // Handle hover border color for inline styles
    if (columnSettings.hoverBorderColor) {
      columnClasses.push("transition-colors duration-200");
    }

    return (
      <div key={index} style={columnStyles} className={cn(...columnClasses)}>
        {column.elements
          ?.filter(
            (element) => element && typeof element === "object" && element.id
          )
          .map((element, elemIndex) => {
            // Get the original element index from the unfiltered array
            const originalIndex = column.elements.findIndex(
              (el) => el.id === element.id
            );

            const elementSettings = (element.settings as ElementSettings) || {};

            // Check if this element and the next one should be inline
            const isInlineElement =
              element.settings?.display === "inline-block" ||
              element.type === "button";
            const nextElement = column.elements[originalIndex + 1];
            const isNextInline =
              nextElement?.settings?.display === "inline-block" ||
              nextElement?.type === "button";

            // If this is an inline element, group consecutive inline elements
            if (
              isInlineElement &&
              !processedInlineElements.has(originalIndex)
            ) {
              const inlineGroup: {
                element: (typeof column.elements)[number];
                index: number;
              }[] = [];
              let currentIndex = originalIndex;

              // Collect consecutive inline elements
              while (currentIndex < column.elements.length) {
                const currentElement = column.elements[currentIndex];

                // Skip null/undefined elements
                if (!currentElement || typeof currentElement !== "object") {
                  currentIndex++;
                  continue;
                }

                const isCurrentInline =
                  currentElement.settings?.display === "inline-block" ||
                  currentElement.type === "button";

                if (isCurrentInline) {
                  inlineGroup.push({
                    element: currentElement,
                    index: currentIndex,
                  });
                  processedInlineElements.add(currentIndex);
                  currentIndex++;
                } else {
                  break;
                }
              }

              // Get the text alignment from the first element in the group to align buttons properly
              const groupAlignment =
                inlineGroup[0]?.element.settings?.textAlign || "left";
              const getJustifyContent = (align: string) => {
                switch (align) {
                  case "center":
                    return "center";
                  case "right":
                    return "flex-end";
                  case "left":
                  default:
                    return "flex-start";
                }
              };

              // Render inline group
              return (
                <div
                  key={`inline-group-${originalIndex}`}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: getJustifyContent(groupAlignment),
                    gap: "16px",
                    marginTop: elementSettings.marginTop
                      ? `${elementSettings.marginTop}px`
                      : undefined,
                    marginBottom: elementSettings.marginBottom
                      ? `${elementSettings.marginBottom}px`
                      : undefined,
                  }}
                >
                  {inlineGroup.map(({ element: inlineElement, index }) => (
                    <div key={index} style={{ display: "inline-block" }}>
                      <ElementRenderer
                        element={inlineElement}
                        isEditMode={!isPreview}
                      />
                    </div>
                  ))}
                </div>
              );
            }

            // Skip if already processed as part of inline group
            if (processedInlineElements.has(originalIndex)) {
              return null;
            }

            // Render regular block element
            return (
              <div
                key={originalIndex}
                style={{
                  marginTop: elementSettings.marginTop
                    ? `${elementSettings.marginTop}px`
                    : undefined,
                  marginRight: elementSettings.marginRight
                    ? `${elementSettings.marginRight}px`
                    : undefined,
                  marginBottom: elementSettings.marginBottom
                    ? `${elementSettings.marginBottom}px`
                    : undefined,
                  marginLeft: elementSettings.marginLeft
                    ? `${elementSettings.marginLeft}px`
                    : undefined,
                }}
              >
                <ElementRenderer element={element} isEditMode={!isPreview} />
              </div>
            );
          })}
        {column.rows
          ?.filter((row) => row && typeof row === "object")
          .map((row, rowIndex) => <div key={rowIndex}>{renderRow(row)}</div>)}
      </div>
    );
  };

  // Determine the classes for the section - match ResizableStructure classes
  const sectionClasses = [
    "section-container",
    "relative",
    "transition-all",
    "duration-200",
    "box-border",
  ];

  // Add default dark mode background for sections when no custom background is set
  if (!settings.backgroundColor) {
    sectionClasses.push("bg-white", "dark:bg-zinc-900");
  }

  // Handle Tailwind background color classes
  if (settings.backgroundColor) {
    if (isGradientColor(settings.backgroundColor)) {
      // It's a gradient
      sectionClasses.push(
        ...getGradientClasses(settings.backgroundColor.gradient)
      );
    } else if (isThemeColor(settings.backgroundColor)) {
      // It's a theme-aware Tailwind color
      if (theme === "light" && settings.backgroundColor.light?.includes("-")) {
        sectionClasses.push(`bg-${settings.backgroundColor.light}`);
      }
      if (theme === "dark" && settings.backgroundColor.dark?.includes("-")) {
        sectionClasses.push(`dark:bg-${settings.backgroundColor.dark}`);
      }
    } else if (
      typeof settings.backgroundColor === "string" &&
      settings.backgroundColor.includes("-")
    ) {
      // It's a direct Tailwind class
      sectionClasses.push(`bg-${settings.backgroundColor}`);
    }
  }

  return (
    // Outer div to match ResizableStructure margin handling
    <div
      className="relative"
      style={{
        marginTop: settings.marginTop ? `${settings.marginTop}px` : undefined,
        marginRight: settings.marginRight
          ? `${settings.marginRight}px`
          : undefined,
        marginBottom: settings.marginBottom
          ? `${settings.marginBottom}px`
          : undefined,
        marginLeft: settings.marginLeft
          ? `${settings.marginLeft}px`
          : undefined,
      }}
    >
      <div
        style={{
          ...getBackgroundStyles(),
          ...getStructureStyle(settings, "section"),
          paddingTop: settings.paddingTop
            ? `${settings.paddingTop}px`
            : undefined,
          paddingRight: settings.paddingRight
            ? `${settings.paddingRight}px`
            : undefined,
          paddingBottom: settings.paddingBottom
            ? `${settings.paddingBottom}px`
            : undefined,
          paddingLeft: settings.paddingLeft
            ? `${settings.paddingLeft}px`
            : undefined,
        }}
        className={cn(...sectionClasses)}
      >
        {settings.backgroundOverlay && (
          <div
            className={cn(
              "absolute inset-0 pointer-events-none",
              isThemeColor(settings.backgroundOverlay) && {
                [`bg-${(settings.backgroundOverlay as ThemeColor).light}`]:
                  theme === "light" &&
                  (settings.backgroundOverlay as ThemeColor).light?.includes(
                    "-"
                  ),
                [`dark:bg-${(settings.backgroundOverlay as ThemeColor).dark}`]:
                  theme === "dark" &&
                  (settings.backgroundOverlay as ThemeColor).dark?.includes(
                    "-"
                  ),
              }
            )}
            style={
              typeof settings.backgroundOverlay === "string" ||
              (isThemeColor(settings.backgroundOverlay) &&
                (!(settings.backgroundOverlay as ThemeColor).light?.includes(
                  "-"
                ) ||
                  !(settings.backgroundOverlay as ThemeColor).dark?.includes(
                    "-"
                  )))
                ? {
                    backgroundColor: getThemeColor(
                      settings.backgroundOverlay as ColorValue
                    ),
                  }
                : {}
            }
          />
        )}

        <div className={cn("relative z-1 w-full h-full", getContainerClass())}>
          {section.rows
            .filter((row) => row && typeof row === "object")
            .map((row, index) => (
              <div key={index} className="relative">
                {renderRow(row)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
