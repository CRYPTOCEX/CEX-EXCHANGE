"use client";

import { useRef, useState } from "react";
import { m, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ArrowRight, ExternalLink, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { FeatureItemConfig, FeaturesLayoutConfig } from "./types";
import { ThemeConfig, getColor, getGradient, withAlpha } from "../shared/types";

interface FeatureCardProps {
  feature: FeatureItemConfig;
  layout: FeaturesLayoutConfig;
  theme: ThemeConfig;
  index: number;
  animate?: boolean;
}

export default function FeatureCard({
  feature,
  layout,
  theme,
  index,
  animate = true,
}: FeatureCardProps) {
  const {
    iconPosition = "top",
    iconStyle = "default",
    cardStyle = "default",
    hoverEffect = "lift",
    showIndex,
  } = layout;

  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const primaryColor = getColor(theme.primary || "teal");
  const secondaryColor = getColor(theme.secondary || "cyan");
  const featureGradient = feature.gradient
    ? getGradient(feature.gradient)
    : getGradient(theme.primary || "teal");

  // 3D tilt effect
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  // Card style classes
  const cardStyles: Record<string, string> = {
    default: "bg-card",
    bordered: "bg-card border border-border dark:border-border/50",
    elevated: "bg-card shadow-lg shadow-shadow/[calc(0.1*var(--card-shadow-strength))] dark:shadow-surface-2/[calc(0.5*var(--card-shadow-strength))]",
    glass: "bg-card/60 dark:bg-card/5 backdrop-blur-xl border border-border/50 border-border",
    "gradient-border": "bg-card",
    premium: "bg-card dark:bg-surface-2/80 border border-border dark:border-border/50 backdrop-blur-sm",
  };

  // Icon style rendering
  const renderIcon = () => {
    if (!feature.icon && !feature.iconElement) return null;

    const Icon = feature.icon;
    const iconSizeClasses =
      iconPosition === "inline" ? "w-5 h-5" : iconPosition === "left" ? "w-6 h-6" : "w-6 h-6";

    const iconContainerSizes =
      iconPosition === "inline"
        ? "w-10 h-10"
        : iconPosition === "left"
          ? "w-12 h-12"
          : "w-12 h-12";

    if (feature.iconElement) {
      return (
        <m.div
          className={`${iconContainerSizes} relative`}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          {/* Glow behind icon */}
          <div
            className="absolute inset-0 rounded-xl blur-lg opacity-40 dark:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${featureGradient.from}, ${featureGradient.to})`,
            }}
          />
          <div
            className="relative w-full h-full rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${featureGradient.from}, ${featureGradient.to})`,
              boxShadow: `0 8px 24px ${withAlpha(featureGradient.from, 0.19)}`,
            }}
          >
            {feature.iconElement}
          </div>
        </m.div>
      );
    }

    return Icon ? (
      <m.div
        className={`${iconContainerSizes} relative`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {/* Glow behind icon */}
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-40 dark:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${featureGradient.from}, ${featureGradient.to})`,
          }}
        />
        {/* Icon container */}
        <div
          className="relative w-full h-full rounded-xl flex items-center justify-center"
          style={
            iconStyle === "filled"
              ? {
                  background: `linear-gradient(135deg, ${featureGradient.from}, ${featureGradient.to})`,
                  boxShadow: `0 8px 24px ${withAlpha(featureGradient.from, 0.19)}`,
                }
              : iconStyle === "outlined"
                ? {
                    background: "transparent",
                    border: `2px solid ${primaryColor}`,
                  }
                : {
                    background: `linear-gradient(135deg, ${featureGradient.from}, ${featureGradient.to})`,
                    boxShadow: `0 8px 24px ${withAlpha(featureGradient.from, 0.19)}`,
                  }
          }
        >
          <Icon
            className={iconSizeClasses}
            style={{
              /* The filled/gradient variants paint `featureGradient`, which
                 resolves to `--primary`, so the ink is that token's designed
                 pair. A bare "white" here measured 2.95:1 in dark mode — the
                 same defect StatsSection and ProcessSection already fixed by
                 class, surviving here only because a JS string is invisible to
                 every class-level check. */
              color:
                iconStyle === "outlined"
                  ? primaryColor
                  : "hsl(var(--primary-foreground))",
            }}
            strokeWidth={1.5}
          />
        </div>
      </m.div>
    ) : null;
  };

  // Content rendering based on layout
  const renderContent = () => {
    const titleElement = (
      <h3 className="text-lg font-bold text-foreground mb-2">
        {showIndex && (
          <span className="text-subtle-foreground mr-2">
            {String(index + 1).padStart(2, "0")}.
          </span>
        )}
        {feature.title}
      </h3>
    );

    const descriptionElement = (
      <p className="text-muted-foreground text-sm leading-relaxed">
        {feature.description}
      </p>
    );

    const badgeElement = feature.badge && (
      <span
        className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
        style={{
          background: `linear-gradient(135deg, ${withAlpha(featureGradient.from, 0.08)}, ${withAlpha(featureGradient.to, 0.08)})`,
          color: primaryColor,
        }}
      >
        {feature.badge}
      </span>
    );

    // Highlights/Bullets with animated checkmarks
    const highlightsList = feature.highlights || (feature as any).bullets;
    const bulletsElement = highlightsList && highlightsList.length > 0 && (
      <div className="mt-auto space-y-2 pt-4">
        {highlightsList.map((bullet: string, i: number) => (
          <m.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-2"
          >
            <CheckCircle2
              className="w-4 h-4 shrink-0"
              style={{ color: featureGradient.from }}
            />
            <span className="text-sm text-muted-foreground">{bullet}</span>
          </m.div>
        ))}
      </div>
    );

    const statsElement = feature.stats && (
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-2xl font-bold text-foreground">
          {feature.stats.value}
        </div>
        <div className="text-xs text-subtle-foreground">{feature.stats.label}</div>
      </div>
    );

    const linkElement = feature.link && (
      <Link
        href={feature.link.href}
        className="inline-flex items-center gap-1 text-sm font-medium mt-4 transition-colors"
        style={{ color: primaryColor }}
        {...(feature.link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {feature.link.text}
        {feature.link.external ? (
          <ExternalLink className="w-3 h-3" />
        ) : (
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
        )}
      </Link>
    );

    if (iconPosition === "left") {
      return (
        <div className="flex gap-4">
          {renderIcon()}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              {titleElement}
              {badgeElement}
            </div>
            {descriptionElement}
            {bulletsElement}
            {statsElement}
            {linkElement}
          </div>
        </div>
      );
    }

    if (iconPosition === "inline") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            {renderIcon()}
            {titleElement}
            {badgeElement}
          </div>
          {descriptionElement}
          {bulletsElement}
          {statsElement}
          {linkElement}
        </div>
      );
    }

    // Default: icon on top
    return (
      <div className="flex flex-col h-full">
        <div className="mb-5">{renderIcon()}</div>
        <div className="flex items-center gap-2 mb-2">
          {titleElement}
          {badgeElement}
        </div>
        {descriptionElement}
        {bulletsElement}
        {statsElement}
        {linkElement}
      </div>
    );
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98] as const,
      },
    },
  };

  return (
    <m.div
      ref={cardRef}
      variants={animate ? cardVariants : undefined}
      initial={animate ? "hidden" : undefined}
      whileInView={animate ? "visible" : undefined}
      viewport={{ once: true, margin: "-50px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -8, scale: 1.02 }}
      style={{
        rotateX: hoverEffect === "lift" || hoverEffect === "glow" ? rotateX : 0,
        rotateY: hoverEffect === "lift" || hoverEffect === "glow" ? rotateY : 0,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
      className="group relative h-full"
    >
      {/* Glow effect on hover */}
      <m.div
        className="absolute -inset-0.5 rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${withAlpha(featureGradient.from, 0.31)}, ${withAlpha(featureGradient.to, 0.31)})`,
        }}
      />

      {/* Card body */}
      <div
        className={`relative h-full rounded-2xl overflow-hidden p-6 ${cardStyles[cardStyle] || cardStyles.premium}`}
        style={{
          boxShadow: `0 10px 40px -10px hsl(var(--shadow) / 0.1)`,
        }}
      >
        {/* Gradient mesh background */}
        <div
          className="absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-50"
          style={{
            background: `
              radial-gradient(ellipse at 20% 0%, ${withAlpha(featureGradient.from, 0.08)} 0%, transparent 50%),
              radial-gradient(ellipse at 80% 100%, ${withAlpha(featureGradient.to, 0.06)} 0%, transparent 50%)
            `,
          }}
        />

        {/* Animated border on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, ${withAlpha(featureGradient.from, 0.19)}, ${withAlpha(featureGradient.to, 0.19)})`,
            padding: "1px",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
          }}
        />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Image (if provided) */}
          {feature.image && (
            <div className="mb-4 rounded-xl overflow-hidden">
              <img
                src={feature.image}
                alt={feature.title}
                className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </m.div>
  );
}
