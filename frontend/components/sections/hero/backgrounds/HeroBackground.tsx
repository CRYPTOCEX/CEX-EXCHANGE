"use client";

import { BackgroundConfig } from "../types";
import { Particles } from "@/components/ui/particles";
import GradientOrbs from "./GradientOrbs";
import GridPattern from "./GridPattern";

interface HeroBackgroundProps {
  config?: BackgroundConfig;
  theme?: {
    primary?: string;
    secondary?: string;
  };
}

// Color map for gradient backgrounds
const colorMap: Record<string, string> = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  emerald: "#10b981",
  indigo: "#6366f1",
  violet: "#8b5cf6",
};

const defaultBackground: BackgroundConfig = {
  variant: "gradient",
  gradientDirection: "to-br",
  particles: { enabled: true },
  gridPattern: { enabled: true, opacity: 0.02 },
  bottomFade: true,
};

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

export default function HeroBackground({
  config = defaultBackground,
  theme = { primary: "teal", secondary: "cyan" },
}: HeroBackgroundProps) {
  const {
    variant = "gradient",
    gradientFrom,
    gradientVia,
    gradientTo,
    gradientDirection = "to-br",
    solidColor,
    imageUrl,
    imageOverlay = true,
    imageOverlayOpacity = 50,
    videoUrl,
    videoPoster,
    orbs,
    particles,
    gridPattern,
    bottomFade = true,
    bottomFadeColor,
  } = config;

  const primaryColor = colorMap[theme.primary || "teal"] || colorMap.teal;
  const secondaryColor = colorMap[theme.secondary || "cyan"] || colorMap.cyan;

  const getGradientStyle = (): React.CSSProperties => {
    const direction = directionMap[gradientDirection] || "to bottom right";
    const from = gradientFrom || `${primaryColor}0d`; // 5% opacity
    const via = gradientVia || "#ffffff";
    const to = gradientTo || `${secondaryColor}0d`; // 5% opacity

    return {
      backgroundImage: `linear-gradient(${direction}, ${from}, ${via}, ${to})`,
    };
  };

  const renderBackground = () => {
    switch (variant) {
      case "gradient":
        return (
          <div
            className="absolute inset-0 dark:hidden"
            style={getGradientStyle()}
          />
        );

      case "solid":
        return (
          <div
            className={`absolute inset-0 ${solidColor || "bg-white dark:bg-zinc-900"}`}
          />
        );

      case "image":
        return (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
            {imageOverlay && (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `rgba(0, 0, 0, ${imageOverlayOpacity / 100})` }}
              />
            )}
          </>
        );

      case "video":
        return (
          <>
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={videoPoster}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
            {imageOverlay && (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `rgba(0, 0, 0, ${imageOverlayOpacity / 100})` }}
              />
            )}
          </>
        );

      case "none":
        return null;

      default:
        return null;
    }
  };

  return (
    <>
      {/* Base background - z-0 */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {renderBackground()}
      </div>

      {/* Dark mode gradient background - z-0 */}
      {variant === "gradient" && (
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: `linear-gradient(${directionMap[gradientDirection] || "to bottom right"}, ${primaryColor}1a, #18181b, ${secondaryColor}1a)`,
            zIndex: 0,
          }}
        />
      )}

      {/* Grid pattern - z-1 (behind orbs and particles) */}
      <div style={{ zIndex: 1 }}>
        <GridPattern config={gridPattern} />
      </div>

      {/* Gradient orbs - z-2-4 (depth-aware, managed in component) */}
      {orbs && <GradientOrbs orbs={orbs} />}

      {/* Particles - z-5 (in front of orbs) */}
      {particles?.enabled && (
        <div style={{ zIndex: 5 }}>
          <Particles
            config={{
              count: particles.count || 30,
              primaryColor: theme.primary || "teal",
              secondaryColor: theme.secondary || "cyan",
              size: { min: particles.minSize || 3, max: particles.maxSize || 8 },
              speed: 1,
              opacity: { min: 0.4, max: 0.8 },
              glow: true,
              rising: true,
            }}
          />
        </div>
      )}

      {/* Bottom fade - z-6 - creates depth and blends into sections below */}
      {bottomFade && (
        <>
          {/* Light mode bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none dark:hidden"
            style={{
              zIndex: 6,
              background: bottomFadeColor
                ? undefined
                : `linear-gradient(to top, rgb(255, 255, 255) 0%, rgba(255, 255, 255, 0.95) 15%, rgba(255, 255, 255, 0.7) 35%, rgba(255, 255, 255, 0.3) 60%, transparent 100%)`,
            }}
          >
            {bottomFadeColor && (
              <div className={`w-full h-full ${bottomFadeColor}`} />
            )}
          </div>
          {/* Dark mode bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none hidden dark:block"
            style={{
              zIndex: 6,
              background: bottomFadeColor
                ? undefined
                : `linear-gradient(to top, rgb(9, 9, 11) 0%, rgba(9, 9, 11, 0.95) 15%, rgba(9, 9, 11, 0.7) 35%, rgba(9, 9, 11, 0.3) 60%, transparent 100%)`,
            }}
          >
            {bottomFadeColor && (
              <div className={`w-full h-full ${bottomFadeColor}`} />
            )}
          </div>
        </>
      )}
    </>
  );
}
