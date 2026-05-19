"use client";

import { motion } from "framer-motion";
import { SectionBackgroundConfig, ThemeConfig, colorMap, getColor } from "./types";
import { Particles } from "@/components/ui/particles";

interface SectionBackgroundProps {
  config?: SectionBackgroundConfig;
  theme?: ThemeConfig;
}

const directionMap: Record<string, string> = {
  "to-r": "to right",
  "to-l": "to left",
  "to-t": "to top",
  "to-b": "to bottom",
  "to-br": "to bottom right",
  "to-bl": "to bottom left",
  "to-tr": "to top right",
  "to-tl": "to top left",
};

const defaultBackground: SectionBackgroundConfig = {
  variant: "gradient",
  gradientDirection: "to-br",
  bottomFade: false,
};

export default function SectionBackground({
  config = defaultBackground,
  theme = { primary: "teal", secondary: "cyan" },
}: SectionBackgroundProps) {
  const {
    variant = "gradient",
    gradientFrom,
    gradientVia,
    gradientTo,
    gradientDirection = "to-br",
    solidColor,
    orbs,
    particles,
    gridPattern,
    topFade,
    bottomFade,
    fadeColor,
  } = config;

  const primaryColor = getColor(theme.primary || "teal");
  const secondaryColor = getColor(theme.secondary || "cyan");

  const getGradientStyle = (): React.CSSProperties => {
    const direction = directionMap[gradientDirection] || "to bottom right";
    const from = gradientFrom || `${primaryColor}08`;
    const via = gradientVia || "transparent";
    const to = gradientTo || `${secondaryColor}08`;

    return {
      backgroundImage: `linear-gradient(${direction}, ${from}, ${via}, ${to})`,
    };
  };

  const renderGridPattern = () => {
    if (!gridPattern?.enabled) return null;

    const patternVariant = gridPattern.variant || "lines";
    const opacity = gridPattern.opacity || 0.03;
    const size = gridPattern.size || 40;
    const color = gridPattern.color || "#888888";

    let patternStyle: React.CSSProperties = {};

    switch (patternVariant) {
      case "dots":
        patternStyle = {
          backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
          backgroundSize: `${size}px ${size}px`,
          opacity,
        };
        break;
      case "squares":
        patternStyle = {
          backgroundImage: `
            linear-gradient(${color} 1px, transparent 1px),
            linear-gradient(90deg, ${color} 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
          opacity,
        };
        break;
      case "lines":
      default:
        patternStyle = {
          backgroundImage: `linear-gradient(${color} 1px, transparent 1px)`,
          backgroundSize: `100% ${size}px`,
          opacity,
        };
        break;
    }

    return <div className="absolute inset-0" style={patternStyle} />;
  };

  const renderOrbs = () => {
    if (!orbs || orbs.length === 0) return null;

    const positionStyles: Record<string, { left?: string; right?: string; top?: string; bottom?: string }> = {
      "top-left": { left: "0%", top: "0%" },
      "top-right": { right: "0%", top: "0%" },
      "bottom-left": { left: "0%", bottom: "0%" },
      "bottom-right": { right: "0%", bottom: "0%" },
      center: { left: "50%", top: "50%" },
    };

    const sizeMap: Record<string, number> = {
      sm: 150,
      md: 250,
      lg: 400,
      xl: 600,
    };

    return orbs.map((orb, index) => {
      const orbColor = getColor(orb.color);
      const orbSize = sizeMap[orb.size] || 250;
      const position = positionStyles[orb.position] || positionStyles.center;
      const delay = orb.animationDelay || index * 0.5;

      return (
        <motion.div
          key={index}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orbSize,
            height: orbSize,
            ...position,
            transform: orb.position === "center" ? "translate(-50%, -50%)" : undefined,
            background: `radial-gradient(circle at 30% 30%, ${orbColor}${Math.round(orb.opacity * 2.55)
              .toString(16)
              .padStart(2, "0")}, ${orbColor}${Math.round(orb.opacity * 1.5)
              .toString(16)
              .padStart(2, "0")}, transparent 70%)`,
            filter: `blur(${orb.blur}px)`,
            zIndex: 2 + index,
          }}
          animate={
            orb.animate
              ? {
                  scale: [1, 1.15, 1],
                  opacity: [0.8, 1, 0.8],
                  x: [0, 20, 0],
                  y: [0, -15, 0],
                }
              : undefined
          }
          transition={
            orb.animate
              ? {
                  duration: 8 + index * 2,
                  delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        />
      );
    });
  };

  const renderBackground = () => {
    switch (variant) {
      case "gradient":
        return (
          <>
            <div className="absolute inset-0 dark:hidden" style={getGradientStyle()} />
            <div
              className="absolute inset-0 hidden dark:block"
              style={{
                backgroundImage: `linear-gradient(${
                  directionMap[gradientDirection] || "to bottom right"
                }, ${primaryColor}12, transparent, ${secondaryColor}12)`,
              }}
            />
          </>
        );

      case "solid":
        return (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: solidColor || "transparent" }}
          />
        );

      case "pattern":
        return renderGridPattern();

      case "mesh":
        return (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(at 40% 20%, ${primaryColor}20 0px, transparent 50%),
                radial-gradient(at 80% 0%, ${secondaryColor}15 0px, transparent 50%),
                radial-gradient(at 0% 50%, ${primaryColor}10 0px, transparent 50%),
                radial-gradient(at 80% 50%, ${secondaryColor}10 0px, transparent 50%),
                radial-gradient(at 0% 100%, ${primaryColor}15 0px, transparent 50%),
                radial-gradient(at 80% 100%, ${secondaryColor}20 0px, transparent 50%)
              `,
            }}
          />
        );

      case "none":
      default:
        return null;
    }
  };

  return (
    <>
      {/* Base background */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        {renderBackground()}
      </div>

      {/* Grid pattern */}
      {gridPattern?.enabled && variant !== "pattern" && (
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          {renderGridPattern()}
        </div>
      )}

      {/* Gradient orbs */}
      {renderOrbs()}

      {/* Particles */}
      {particles?.enabled && (
        <div className="absolute inset-0" style={{ zIndex: 5 }}>
          <Particles
            config={{
              count: particles.count || 20,
              primaryColor: particles.primaryColor || theme.primary || "teal",
              secondaryColor: particles.secondaryColor || theme.secondary || "cyan",
              size: particles.size || { min: 2, max: 6 },
              speed: particles.speed || 1,
              opacity: particles.opacity || { min: 0.3, max: 0.7 },
              glow: particles.glow ?? true,
              rising: particles.rising ?? true,
            }}
          />
        </div>
      )}

      {/* Top fade */}
      {topFade && (
        <div
          className={`absolute top-0 left-0 right-0 h-24 pointer-events-none ${
            fadeColor || "bg-linear-to-b from-white dark:from-zinc-950 to-transparent"
          }`}
          style={{ zIndex: 6 }}
        />
      )}

      {/* Bottom fade */}
      {bottomFade && (
        <div
          className={`absolute bottom-0 left-0 right-0 h-24 pointer-events-none ${
            fadeColor || "bg-linear-to-t from-white dark:from-zinc-950 to-transparent"
          }`}
          style={{ zIndex: 6 }}
        />
      )}
    </>
  );
}
