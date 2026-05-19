"use client";

import React, { useEffect, useState, memo, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import type { Element } from "@/types/builder";
import { cn } from "@/lib/utils";

// Optimized Animated Image Grid Element
export const AnimatedImageGridElement = memo(
  ({ element }: { element: Element }) => {
    const settings = element.settings || {};
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Memoized default settings
    const defaultImageColumns = useMemo(
      () => ({
        col1: [
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
        ],
        col2: [
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
        ],
        col3: [
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
          {
            light: "/placeholder.svg?height=200&width=300",
            dark: "/placeholder.svg?height=200&width=300",
          },
        ],
      }),
      []
    );

    // Memoized settings
    const processedSettings = useMemo(
      () => ({
        columns: settings.columns || 3,
        perspective: settings.perspective || 700,
        rotateX: settings.rotateX || 15,
        rotateY: settings.rotateY || -9,
        rotateZ: settings.rotateZ || 32,
        scale: settings.scale || { x: 0.9, y: 0.8, z: 1 },
        translateX: settings.translateX || 7,
        translateY: settings.translateY || -2,
        translateZ: settings.translateZ || 0,
        gap: settings.gap || 12,
        imageColumns: settings.imageColumns || defaultImageColumns,
        animationDirections: settings.animationDirections || {
          col1: "up",
          col2: "down",
          col3: "up",
        },
        animationSpeeds: settings.animationSpeeds || {
          col1: "normal",
          col2: "normal",
          col3: "slow",
        },
      }),
      [settings, defaultImageColumns]
    );

    // Memoized styles
    const containerStyle = useMemo(
      (): React.CSSProperties => ({
        perspective: `${processedSettings.perspective}px`,
      }),
      [processedSettings.perspective]
    );

    const gridStyle = useMemo(
      (): React.CSSProperties => ({
        transform: `translate3d(${processedSettings.translateX}%, ${processedSettings.translateY}%, ${processedSettings.translateZ}px) scale3d(${processedSettings.scale.x}, ${processedSettings.scale.y}, ${processedSettings.scale.z}) rotateX(${processedSettings.rotateX}deg) rotateY(${processedSettings.rotateY}deg) rotateZ(${processedSettings.rotateZ}deg)`,
      }),
      [processedSettings]
    );

    // Memoized animation class generator
    const getAnimationClass = useCallback(
      (colIndex: number) => {
        const colKey =
          `col${colIndex + 1}` as keyof typeof processedSettings.animationDirections;
        const direction = processedSettings.animationDirections[colKey] || "up";
        const speed = processedSettings.animationSpeeds[colKey] || "normal";

        let baseClass = "";
        if (direction === "up") {
          baseClass = "animate-slide-up";
        } else if (direction === "down") {
          baseClass = "animate-slide-down";
        }

        if (speed === "slow") {
          baseClass += "-slow";
        } else if (speed === "fast") {
          baseClass += "-fast";
        }

        return baseClass;
      },
      [processedSettings.animationDirections, processedSettings.animationSpeeds]
    );

    // Memoized grid classes
    const gridClasses = useMemo(
      () =>
        cn(
          `grid grid-cols-${processedSettings.columns} gap-${processedSettings.gap} w-full h-full overflow-hidden origin-[50%_0%]`
        ),
      [processedSettings.columns, processedSettings.gap]
    );

    // Memoized image component
    const ImagePair = memo(
      ({
        image,
        colIndex,
        index,
        theme,
      }: {
        image: any;
        colIndex: number;
        index: number;
        theme: string | undefined;
      }) => {
        const imageClasses = useMemo(
          () =>
            "w-full h-full object-cover shadow-lg rounded-lg border border-muted-200 dark:border-muted-800 hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-300",
          []
        );

        return (
          <div className="relative aspect-[4/3]">
            <img
              className={cn(
                imageClasses,
                theme === "dark" ? "hidden" : "block"
              )}
              src={image.light || "/placeholder.svg"}
              alt={`Image ${colIndex}-${index + 1}`}
              loading="lazy"
            />
            <img
              className={cn(
                imageClasses,
                theme === "dark" ? "block" : "hidden"
              )}
              src={image.dark || "/placeholder.svg"}
              alt={`Image ${colIndex}-${index + 1}`}
              loading="lazy"
            />
          </div>
        );
      }
    );

    ImagePair.displayName = "ImagePair";

    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) {
      return null;
    }

    return (
      <div
        className="w-full h-[20rem] sm:h-[30rem] lg:h-[35rem] overflow-hidden rounded-lg"
        style={containerStyle}
        data-element-id={element.id}
        data-element-type="animated-image-grid"
      >
        <div className={gridClasses} style={gridStyle}>
          {Array.from({ length: processedSettings.columns }).map(
            (_, colIndex) => {
              const colKey =
                `col${colIndex + 1}` as keyof typeof processedSettings.imageColumns;
              const images = processedSettings.imageColumns[colKey] || [];

              return (
                <div
                  key={colIndex}
                  className={cn(
                    "grid gap-9 w-full h-full",
                    getAnimationClass(colIndex)
                  )}
                >
                  {images.map((image, index) => (
                    <ImagePair
                      key={index}
                      image={image}
                      colIndex={colIndex}
                      index={index}
                      theme={theme}
                    />
                  ))}
                </div>
              );
            }
          )}
        </div>
      </div>
    );
  }
);

AnimatedImageGridElement.displayName = "AnimatedImageGridElement";
