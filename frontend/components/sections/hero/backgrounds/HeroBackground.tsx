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

/**
 * Theme colour names -> design tokens.
 *
 * Every extension landing page picks a `theme.primary`/`theme.secondary` from
 * this map, which is why /staking was violet, /ecommerce teal and /ico cyan
 * while the nav above them was azure. The page wash identifies nothing, so the
 * decorative names collapse to the accent; status names keep their meaning.
 *
 * The old `primary`/`secondary` entries were `var(--primary)` — the raw HSL
 * triplet, not a colour — so any caller choosing them produced an invalid
 * gradient stop and no background at all.
 */
const TOKEN_BY_NAME: Record<string, string> = {
  primary: "primary",
  secondary: "secondary",
  teal: "primary",
  cyan: "primary",
  blue: "primary",
  purple: "primary",
  pink: "primary",
  indigo: "primary",
  violet: "primary",
  red: "destructive",
  orange: "warning",
  yellow: "warning",
  green: "success",
  emerald: "success",
};

/** `hsl(var(--x) / a)` rather than hex-alpha concatenation, which silently
 *  produced nonsense for any value that was not a six-digit hex. */
const alpha = (token: string, a: number) => `hsl(var(--${token}) / ${a})`;

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

  const primaryToken = TOKEN_BY_NAME[theme.primary || "primary"] || "primary";
  const secondaryToken = TOKEN_BY_NAME[theme.secondary || "primary"] || "primary";

  const getGradientStyle = (): React.CSSProperties => {
    const direction = directionMap[gradientDirection] || "to bottom right";
    const from = gradientFrom || alpha(primaryToken, 0.05);
    const via = gradientVia || "hsl(var(--background))";
    const to = gradientTo || alpha(secondaryToken, 0.05);

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
            className={`absolute inset-0 ${solidColor || "bg-card"}`}
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
                style={{ backgroundColor: `hsl(var(--overlay) / ${imageOverlayOpacity / 100})` }}
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
                style={{ backgroundColor: `hsl(var(--overlay) / ${imageOverlayOpacity / 100})` }}
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
            backgroundImage: `linear-gradient(${directionMap[gradientDirection] || "to bottom right"}, ${alpha(primaryToken, 0.1)}, hsl(var(--background)), ${alpha(secondaryToken, 0.1)})`,
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
          {/*
            One fade instead of two. It existed twice because the stops were
            hardcoded white and zinc-950, so each theme needed its own copy —
            and neither matched `--background`, leaving a visible seam where the
            hero met the section below it. `--background` is theme-aware, so a
            single element is now correct in both.
          */}
          <div
            className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
            style={{
              zIndex: 6,
              background: bottomFadeColor
                ? undefined
                : `linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 15%, hsl(var(--background) / 0.7) 35%, hsl(var(--background) / 0.3) 60%, transparent 100%)`,
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
