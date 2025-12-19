"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Particles, type ParticleConfig, type ParticlePreset } from "@/components/ui/particles";

// ============================================================================
// BACKGROUND GRADIENT TYPES
// ============================================================================

interface GradientOrb {
  color: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  size: string;
  blur?: string;
  opacity?: number;
  animate?: boolean;
  animationDelay?: number;
}

interface BackgroundConfig {
  orbs?: GradientOrb[];
  pattern?: "gradient" | "dots" | "grid" | "none";
  patternColor?: string;
}

// ============================================================================
// TITLE TYPES
// ============================================================================

interface TitlePart {
  text: string;
  gradient?: string; // e.g., "from-purple-500 via-blue-500 to-purple-600"
  className?: string;
}

type TitleConfig = string | TitlePart[];

// ============================================================================
// BADGE TYPES
// ============================================================================

interface BadgeConfig {
  icon?: ReactNode;
  text: string;
  gradient?: string;
  iconColor?: string;
  textColor?: string;
  borderColor?: string;
}

// ============================================================================
// BREADCRUMB TYPES
// ============================================================================

interface BreadcrumbConfig {
  icon?: ReactNode;
  text: string;
  href: string;
  className?: string;
}

// ============================================================================
// MAIN HERO SECTION PROPS
// ============================================================================

interface HeroSectionProps {
  // Above title options (choose one: badge, breadcrumb, or custom aboveTitle)
  badge?: BadgeConfig;
  breadcrumb?: BreadcrumbConfig;

  // Title
  title: TitleConfig;
  titleClassName?: string;

  // Description
  description?: string;
  descriptionClassName?: string;
  descriptionAsHtml?: boolean; // Render description as HTML (for rich text content)

  // Content slots
  children?: ReactNode; // Content below description
  titleLeftContent?: ReactNode; // Content to the left of title/description (e.g., avatar, icon)
  titleLeftContentClassName?: string; // Additional classes for title left content wrapper
  leftContent?: ReactNode; // Content on the left side (for split-reverse layout)
  rightContent?: ReactNode; // Content on the right side
  bottomSlot?: ReactNode; // Bottom slot below hero content

  // Background
  background?: BackgroundConfig;

  // Particles - now uses the unified particle system
  particles?: ParticleConfig;

  // Layout
  // - "default": Simple stacked layout
  // - "centered": Centered text layout
  // - "split": Title/description on left, rightContent on right
  // - "split-reverse": leftContent on left, title/description on right
  layout?: "default" | "centered" | "split" | "split-reverse";
  maxWidth?: string;
  containerClassName?: string;
  contentClassName?: string;
  leftContentClassName?: string; // Additional classes for left content wrapper
  rightContentAlign?: "start" | "center" | "end"; // Alignment for right content in split layout

  // Border
  showBorder?: boolean;
  borderClassName?: string;

  // Padding
  paddingTop?: string;
  paddingBottom?: string;

  // Animation
  animationDelay?: number;
}

// ============================================================================
// HERO SECTION COMPONENT
// ============================================================================

export function HeroSection({
  badge,
  breadcrumb,
  title,
  titleClassName = "text-3xl md:text-4xl lg:text-5xl",
  description,
  descriptionClassName = "text-lg md:text-xl",
  descriptionAsHtml = false,
  children,
  titleLeftContent,
  titleLeftContentClassName = "",
  leftContent,
  rightContent,
  bottomSlot,
  background = {},
  particles,
  layout = "default",
  maxWidth = "max-w-4xl",
  containerClassName = "",
  contentClassName = "",
  leftContentClassName = "",
  rightContentAlign = "start",
  showBorder = true,
  borderClassName = "border-b border-zinc-200/50 dark:border-zinc-800/50",
  paddingTop = "pt-16 md:pt-20",
  paddingBottom = "pb-12 md:pb-16",
  animationDelay = 0,
}: HeroSectionProps) {
  const {
    orbs = [],
    pattern = "none",
    patternColor = "rgba(255,255,255,0.05)",
  } = background;

  // Render title based on type
  const renderTitle = () => {
    if (typeof title === "string") {
      return (
        <h1 className={`font-bold tracking-tight ${titleClassName}`}>
          <span className="bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
      );
    }

    return (
      <h1 className={`font-bold tracking-tight ${titleClassName}`}>
        {title.map((part, index) => (
          <span key={index}>
            {part.gradient ? (
              <span
                className={`bg-linear-to-r ${part.gradient} bg-clip-text text-transparent ${part.className || ""}`}
              >
                {part.text}
              </span>
            ) : (
              <span
                className={
                  part.className ||
                  "bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent"
                }
              >
                {part.text}
              </span>
            )}{" "}
          </span>
        ))}
      </h1>
    );
  };

  // Render above title content (badge or breadcrumb)
  const renderAboveTitle = () => {
    if (breadcrumb) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: animationDelay }}
        >
          <Link
            href={breadcrumb.href}
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
              breadcrumb.className ||
              "text-zinc-500 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400"
            }`}
          >
            {breadcrumb.icon || <ArrowLeft className="h-4 w-4" />}
            {breadcrumb.text}
          </Link>
        </motion.div>
      );
    }

    if (badge) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: animationDelay }}
          className={layout === "centered" ? "mx-auto" : ""}
        >
          <Badge
            variant="outline"
            className={`w-fit px-3 py-1.5 border-0 ${
              badge.gradient
                ? `bg-linear-to-r ${badge.gradient}`
                : "bg-primary/10"
            } backdrop-blur-sm`}
          >
            {badge.icon && (
              <span className={badge.iconColor || "text-primary"}>
                {badge.icon}
              </span>
            )}
            <span
              className={`text-xs font-medium ${badge.icon ? "ml-1.5" : ""} ${
                badge.textColor || "text-primary"
              }`}
            >
              {badge.text}
            </span>
          </Badge>
        </motion.div>
      );
    }

    return null;
  };

  // Render the title block (title + description) with optional left content (icon/avatar)
  const renderTitleBlock = (withAnimation = true) => {
    const titleContent = (
      <div className="flex flex-col gap-3">
        {/* Title */}
        {withAnimation ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: animationDelay + 0.1 }}
          >
            {renderTitle()}
          </motion.div>
        ) : (
          renderTitle()
        )}

        {/* Description */}
        {description &&
          (withAnimation ? (
            descriptionAsHtml ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: animationDelay + 0.2 }}
                className={`text-zinc-600 dark:text-zinc-400 prose dark:prose-invert prose-p:my-2 prose-headings:my-2 max-w-none ${descriptionClassName}`}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: animationDelay + 0.2 }}
                className={`text-zinc-600 dark:text-zinc-400 ${descriptionClassName}`}
              >
                {description}
              </motion.p>
            )
          ) : descriptionAsHtml ? (
            <div
              className={`text-zinc-600 dark:text-zinc-400 prose dark:prose-invert prose-p:my-2 prose-headings:my-2 max-w-none ${descriptionClassName}`}
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <p
              className={`text-zinc-600 dark:text-zinc-400 ${descriptionClassName}`}
            >
              {description}
            </p>
          ))}

        {/* Children (below description) */}
        {children &&
          (withAnimation ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: animationDelay + 0.3 }}
            >
              {children}
            </motion.div>
          ) : (
            <div>{children}</div>
          ))}
      </div>
    );

    // If titleLeftContent exists, wrap in flex row
    if (titleLeftContent) {
      return (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {withAnimation ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: animationDelay }}
              className={`shrink-0 ${titleLeftContentClassName}`}
            >
              {titleLeftContent}
            </motion.div>
          ) : (
            <div className={`shrink-0 ${titleLeftContentClassName}`}>
              {titleLeftContent}
            </div>
          )}
          <div className="grow">{titleContent}</div>
        </div>
      );
    }

    return titleContent;
  };

  return (
    <div
      className={`relative overflow-hidden ${showBorder ? borderClassName : ""} ${paddingTop} ${paddingBottom} ${containerClassName}`}
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Pattern overlay */}
        {pattern === "dots" && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, ${patternColor} 1px, transparent 1px)`,
              backgroundSize: "30px 30px",
            }}
          />
        )}
        {pattern === "grid" && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(${patternColor} 1px, transparent 1px), linear-gradient(90deg, ${patternColor} 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        )}

        {/* Gradient orbs */}
        {orbs.map((orb, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: orb.opacity ?? 0.3,
              scale: orb.animate !== false ? 1 : 0.8,
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: orb.animationDelay ?? index * 0.2,
            }}
            className="absolute rounded-full"
            style={{
              ...orb.position,
              width: orb.size,
              height: orb.size,
              backgroundColor: orb.color,
              filter: `blur(${orb.blur || "80px"})`,
            }}
          />
        ))}

        {/* Particles - Using the unified particle system */}
        {particles && <Particles config={particles} />}
      </div>

      {/* Content */}
      <div className="container mx-auto relative z-10">
        {layout === "split" || layout === "split-reverse" ? (
          <div
            className={`flex flex-col lg:flex-row gap-8 lg:gap-12 items-start lg:items-${rightContentAlign} lg:justify-between`}
          >
            {/* Left content for split-reverse layout */}
            {layout === "split-reverse" && leftContent && (
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: animationDelay }}
                className={`shrink-0 ${leftContentClassName}`}
              >
                {leftContent}
              </motion.div>
            )}

            {/* Main content area (title block with optional titleLeftContent) */}
            <div className={`grow flex flex-col gap-3 ${contentClassName}`}>
              {/* Above Title (Badge or Breadcrumb) */}
              {renderAboveTitle()}

              {/* Title Block (with optional titleLeftContent) */}
              {renderTitleBlock()}
            </div>

            {/* Right content for split layout */}
            {layout === "split" && rightContent && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: animationDelay + 0.4 }}
                className="shrink-0"
              >
                {rightContent}
              </motion.div>
            )}
          </div>
        ) : (
          <div
            className={`flex flex-col gap-3 ${
              layout === "centered" ? "mx-auto text-center" : ""
            } ${maxWidth} ${contentClassName}`}
          >
            {/* Above Title (Badge or Breadcrumb) */}
            {renderAboveTitle()}

            {/* Title Block (with optional titleLeftContent) */}
            {renderTitleBlock()}

            {/* Right content for default/centered layout */}
            {rightContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: animationDelay + 0.4 }}
                className="mt-6"
              >
                {rightContent}
              </motion.div>
            )}
          </div>
        )}

        {/* Bottom Slot */}
        {bottomSlot && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: animationDelay + 0.5 }}
            className="mt-8"
          >
            {bottomSlot}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Re-export particle types for convenience
export type { ParticleConfig, ParticlePreset };
