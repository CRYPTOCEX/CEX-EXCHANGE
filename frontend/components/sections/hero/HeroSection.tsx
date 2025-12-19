"use client";

import { motion } from "framer-motion";
import { HeroSectionProps, HeroPreset, HeroPresetConfig } from "./types";
import { HeroBackground } from "./backgrounds";
import { HeroTag, HeroHeading, HeroSubtitle } from "./content";
import { HeroActions } from "./actions";
import { HeroStats } from "./stats";
import ScrollIndicator from "./ScrollIndicator";

// ============================================================================
// PRESETS - Quick configurations for common layouts
// ============================================================================

const presets: Record<HeroPreset, HeroPresetConfig> = {
  default: {
    layout: {
      contentPosition: "full",
      contentAlignment: "center",
      minHeight: "screen",
      maxWidth: "5xl",
    },
    background: {
      variant: "gradient",
      particles: { enabled: true },
      gridPattern: { enabled: true },
      bottomFade: true,
    },
    scrollIndicator: { enabled: true, style: "mouse" },
    animation: { enabled: true, staggerChildren: 0.1 },
  },
  centered: {
    layout: {
      contentPosition: "full",
      contentAlignment: "center",
      minHeight: "screen",
      maxWidth: "4xl",
    },
    background: {
      variant: "gradient",
      particles: { enabled: false },
      gridPattern: { enabled: true },
      bottomFade: true,
    },
    scrollIndicator: { enabled: true, style: "chevron" },
    animation: { enabled: true },
  },
  "split-left": {
    layout: {
      contentPosition: "left",
      contentAlignment: "left",
      minHeight: "screen",
      maxWidth: "6xl",
    },
    background: {
      variant: "gradient",
      particles: { enabled: true },
      gridPattern: { enabled: false },
      bottomFade: true,
    },
    scrollIndicator: { enabled: false },
    animation: { enabled: true },
  },
  "split-right": {
    layout: {
      contentPosition: "right",
      contentAlignment: "left",
      minHeight: "screen",
      maxWidth: "6xl",
    },
    background: {
      variant: "gradient",
      particles: { enabled: true },
      gridPattern: { enabled: false },
      bottomFade: true,
    },
    scrollIndicator: { enabled: false },
    animation: { enabled: true },
  },
  minimal: {
    layout: {
      contentPosition: "full",
      contentAlignment: "center",
      minHeight: "half",
      maxWidth: "3xl",
    },
    background: {
      variant: "none",
      bottomFade: false,
    },
    scrollIndicator: { enabled: false },
    animation: { enabled: true },
  },
  "gradient-heavy": {
    layout: {
      contentPosition: "full",
      contentAlignment: "center",
      minHeight: "screen",
      maxWidth: "5xl",
    },
    background: {
      variant: "gradient",
      orbs: [
        { position: "top-left", size: "xl", color: "primary", blur: 120, opacity: 30, animate: true },
        { position: "bottom-right", size: "lg", color: "secondary", blur: 100, opacity: 25, animate: true, animationDelay: 1 },
        { position: "center", size: "md", color: "primary", blur: 80, opacity: 20, animate: true, animationDelay: 2 },
      ],
      particles: { enabled: true, count: 30 },
      gridPattern: { enabled: true },
      bottomFade: true,
    },
    scrollIndicator: { enabled: true, style: "mouse" },
    animation: { enabled: true },
  },
  "image-background": {
    layout: {
      contentPosition: "full",
      contentAlignment: "center",
      minHeight: "screen",
      maxWidth: "4xl",
    },
    background: {
      variant: "image",
      imageOverlay: true,
      imageOverlayOpacity: 60,
      bottomFade: false,
    },
    scrollIndicator: { enabled: true, style: "arrow" },
    animation: { enabled: true },
  },
  "video-background": {
    layout: {
      contentPosition: "full",
      contentAlignment: "center",
      minHeight: "screen",
      maxWidth: "4xl",
    },
    background: {
      variant: "video",
      imageOverlay: true,
      imageOverlayOpacity: 50,
      bottomFade: false,
    },
    scrollIndicator: { enabled: true, style: "arrow" },
    animation: { enabled: true },
  },
};

// ============================================================================
// UTILITY CLASSES
// ============================================================================

const minHeightClasses = {
  screen: "min-h-screen",
  auto: "min-h-auto",
  half: "min-h-[50vh]",
  "three-quarters": "min-h-[75vh]",
};

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

const verticalPaddingClasses = {
  sm: "py-12",
  md: "py-16",
  lg: "py-24",
  xl: "py-32",
};

const alignmentClasses = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface HeroSectionComponentProps extends HeroSectionProps {
  preset?: HeroPreset;
  statsLoading?: boolean;
}

export default function HeroSection({
  content,
  layout,
  background,
  scrollIndicator,
  animation,
  theme = { primary: "primary", secondary: "secondary" },
  className,
  children,
  preset,
  statsLoading = false,
}: HeroSectionComponentProps) {
  // Apply preset if provided
  const presetConfig = preset ? presets[preset] : null;

  // Merge configurations with props taking precedence
  const finalLayout = { ...presetConfig?.layout, ...layout };
  const finalBackground = { ...presetConfig?.background, ...background };
  const finalScrollIndicator = { ...presetConfig?.scrollIndicator, ...scrollIndicator };
  const finalAnimation = { ...presetConfig?.animation, ...animation };

  const {
    contentPosition = "full",
    contentAlignment = "center",
    sideContent,
    sideContentPosition = "right",
    verticalPadding = "lg",
    minHeight = "screen",
    maxWidth = "5xl",
    containerClassName,
  } = finalLayout;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: finalAnimation.staggerChildren || 0.1,
        delayChildren: finalAnimation.delayChildren || 0.2,
      },
    },
  };

  const renderContent = () => {
    const contentElement = (
      <div className={`flex flex-col ${alignmentClasses[contentAlignment]}`}>
        {/* Custom content above heading */}
        {content.customContent && content.customContentPosition === "above-heading" && (
          <div className="mb-4">{content.customContent}</div>
        )}

        {/* Tag */}
        {content.tag && (
          <HeroTag
            config={content.tag}
            theme={theme}
            animate={finalAnimation.enabled}
          />
        )}

        {/* Custom content below heading */}
        {content.customContent && content.customContentPosition === "below-heading" && (
          <div className="mb-4">{content.customContent}</div>
        )}

        {/* Heading */}
        <HeroHeading
          config={content.heading}
          theme={theme}
          animate={finalAnimation.enabled}
        />

        {/* Custom content below subtitle */}
        {content.customContent && content.customContentPosition === "below-subtitle" && (
          <div className="mb-6">{content.customContent}</div>
        )}

        {/* Subtitle */}
        {content.subtitle && (
          <HeroSubtitle config={content.subtitle} animate={finalAnimation.enabled} />
        )}

        {/* Custom content below actions */}
        {content.customContent && content.customContentPosition === "below-actions" && (
          <div className="mb-8">{content.customContent}</div>
        )}

        {/* Actions */}
        {content.actions && content.actions.length > 0 && (
          <HeroActions
            actions={content.actions}
            theme={theme}
            animate={finalAnimation.enabled}
          />
        )}

        {/* Stats */}
        {content.stats && (
          <HeroStats
            config={content.stats}
            theme={theme}
            animate={finalAnimation.enabled}
            loading={statsLoading}
          />
        )}

        {/* Custom content at bottom */}
        {content.customContent && content.customContentPosition === "bottom" && (
          <div className="mt-8">{content.customContent}</div>
        )}

        {/* Default custom content position */}
        {content.customContent && !content.customContentPosition && (
          <div className="mt-8">{content.customContent}</div>
        )}
      </div>
    );

    // Split layout with side content
    if (sideContent && contentPosition !== "full") {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {sideContentPosition === "left" ? (
            <>
              <div>{sideContent}</div>
              {contentElement}
            </>
          ) : (
            <>
              {contentElement}
              <div>{sideContent}</div>
            </>
          )}
        </div>
      );
    }

    return contentElement;
  };

  return (
    <section
      className={`relative ${minHeightClasses[minHeight]} flex items-center overflow-hidden ${verticalPaddingClasses[verticalPadding]} ${className || ""}`}
    >
      {/* Background */}
      <HeroBackground config={finalBackground} theme={theme} />

      {/* Main content container */}
      <div className="container mx-auto relative z-10">
        <motion.div
          variants={finalAnimation.enabled ? containerVariants : undefined}
          initial={finalAnimation.enabled ? "hidden" : undefined}
          animate={finalAnimation.enabled ? "visible" : undefined}
          className={`${maxWidthClasses[maxWidth]} mx-auto ${containerClassName || ""}`}
        >
          {children || renderContent()}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator config={finalScrollIndicator} />
    </section>
  );
}

// Export presets for external use
export { presets as heroPresets };
