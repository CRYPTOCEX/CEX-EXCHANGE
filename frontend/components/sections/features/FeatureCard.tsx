"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ArrowRight, ExternalLink, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { FeatureItemConfig, FeaturesLayoutConfig } from "./types";
import { ThemeConfig, getColor, getGradient } from "../shared/types";

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
    default: "bg-white dark:bg-zinc-900",
    bordered: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50",
    elevated: "bg-white dark:bg-zinc-900 shadow-lg dark:shadow-zinc-900/50",
    glass: "bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10",
    "gradient-border": "bg-white dark:bg-zinc-900",
    premium: "bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 backdrop-blur-sm",
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
        <motion.div
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
              boxShadow: `0 8px 24px ${featureGradient.from}30`,
            }}
          >
            {feature.iconElement}
          </div>
        </motion.div>
      );
    }

    return Icon ? (
      <motion.div
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
                  boxShadow: `0 8px 24px ${featureGradient.from}30`,
                }
              : iconStyle === "outlined"
                ? {
                    background: "transparent",
                    border: `2px solid ${primaryColor}`,
                  }
                : {
                    background: `linear-gradient(135deg, ${featureGradient.from}, ${featureGradient.to})`,
                    boxShadow: `0 8px 24px ${featureGradient.from}30`,
                  }
          }
        >
          <Icon
            className={iconSizeClasses}
            style={{ color: iconStyle === "outlined" ? primaryColor : "white" }}
            strokeWidth={1.5}
          />
        </div>
      </motion.div>
    ) : null;
  };

  // Content rendering based on layout
  const renderContent = () => {
    const titleElement = (
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
        {showIndex && (
          <span className="text-zinc-400 dark:text-zinc-500 mr-2">
            {String(index + 1).padStart(2, "0")}.
          </span>
        )}
        {feature.title}
      </h3>
    );

    const descriptionElement = (
      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
        {feature.description}
      </p>
    );

    const badgeElement = feature.badge && (
      <span
        className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
        style={{
          background: `linear-gradient(135deg, ${featureGradient.from}15, ${featureGradient.to}15)`,
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
          <motion.div
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
            <span className="text-sm text-zinc-600 dark:text-zinc-300">{bullet}</span>
          </motion.div>
        ))}
      </div>
    );

    const statsElement = feature.stats && (
      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-2xl font-bold text-zinc-900 dark:text-white">
          {feature.stats.value}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{feature.stats.label}</div>
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
    <motion.div
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
      <motion.div
        className="absolute -inset-0.5 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${featureGradient.from}50, ${featureGradient.to}50)`,
        }}
      />

      {/* Card body */}
      <div
        className={`relative h-full rounded-2xl overflow-hidden p-6 ${cardStyles[cardStyle] || cardStyles.premium}`}
        style={{
          boxShadow: `0 10px 40px -10px rgba(0,0,0,0.1)`,
        }}
      >
        {/* Gradient mesh background */}
        <div
          className="absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-50"
          style={{
            background: `
              radial-gradient(ellipse at 20% 0%, ${featureGradient.from}15 0%, transparent 50%),
              radial-gradient(ellipse at 80% 100%, ${featureGradient.to}10 0%, transparent 50%)
            `,
          }}
        />

        {/* Animated border on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, ${featureGradient.from}30, ${featureGradient.to}30)`,
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
    </motion.div>
  );
}
