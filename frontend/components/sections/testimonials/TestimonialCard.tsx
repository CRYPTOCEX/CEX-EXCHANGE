"use client";

import { m } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { TestimonialItemConfig, TestimonialsLayoutConfig } from "./types";
import { ThemeConfig, getColor, getGradient } from "../shared/types";

interface TestimonialCardProps {
  testimonial: TestimonialItemConfig;
  layout: TestimonialsLayoutConfig;
  theme: ThemeConfig;
  index: number;
  animate?: boolean;
  isSpotlight?: boolean;
}

export default function TestimonialCard({
  testimonial,
  layout,
  theme,
  index,
  animate = true,
  isSpotlight = false,
}: TestimonialCardProps) {
  const {
    showRating = true,
    showLogo = false,
    showDate = false,
    cardStyle = "default",
    avatarStyle = "circle",
    avatarSize = "md",
    quoteStyle = "default",
  } = layout;

  const primaryColor = getColor(theme.primary || "teal");
  const gradient = getGradient(theme.primary || "teal");

  // Card style classes
  const cardStyles: Record<string, string> = {
    default: "bg-card",
    bordered: "bg-card border border-border",
    elevated: "bg-card shadow-xl shadow-shadow/[calc(0.15*var(--card-shadow-strength))] dark:shadow-surface-2/[calc(0.5*var(--card-shadow-strength))]",
    glass:
      "bg-card/60 dark:bg-card/5 backdrop-blur-xl border border-border/50 border-border",
    "gradient-accent": "bg-card border-l-4",
  };

  // Avatar style classes
  const avatarStyles: Record<string, string> = {
    circle: "rounded-full",
    square: "rounded-none",
    rounded: "rounded-lg",
  };

  // Avatar size classes
  const avatarSizes: Record<string, string> = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  };

  // Animation variants
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

  const Wrapper = animate ? m.div : "div";
  const wrapperProps = animate
    ? {
        variants: cardVariants,
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, margin: "-50px" },
      }
    : {};

  // Render rating stars
  const renderRating = () => {
    if (!showRating || !testimonial.rating) return null;

    return (
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < testimonial.rating!
                ? "fill-warning text-warning"
                : "fill-muted text-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  // Render avatar
  const renderAvatar = () => {
    const { author } = testimonial;

    if (author.avatar) {
      return (
        <img
          src={author.avatar}
          alt={author.name}
          className={`${avatarSizes[avatarSize]} ${avatarStyles[avatarStyle]} object-cover`}
        />
      );
    }

    // Fallback to initials
    const initials =
      author.initials ||
      author.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
      <div
        className={`${avatarSizes[avatarSize]} ${avatarStyles[avatarStyle]} flex items-center justify-center text-overlay-foreground font-semibold`}
        style={{
          background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        }}
      >
        {initials}
      </div>
    );
  };

  // Render quote content
  const renderQuote = () => {
    const quoteClasses = {
      default: "text-muted-foreground",
      large: "text-lg md:text-xl text-muted-foreground font-medium",
      minimal: "text-sm text-muted-foreground",
      "accent-line": "text-muted-foreground pl-4 border-l-2",
    };

    const accentLineStyle =
      quoteStyle === "accent-line" ? { borderColor: primaryColor } : {};

    return (
      <blockquote className={`${quoteClasses[quoteStyle]} leading-relaxed`} style={accentLineStyle}>
        {quoteStyle === "large" && (
          <Quote
            className="w-8 h-8 mb-4 opacity-20"
            style={{ color: primaryColor }}
          />
        )}
        <p>{testimonial.content}</p>
      </blockquote>
    );
  };

  // Render metrics (if provided)
  const renderMetrics = () => {
    if (!testimonial.metrics) return null;

    return (
      <div
        className="mt-4 pt-4 border-t border-border"
      >
        <div className="text-2xl font-bold" style={{ color: primaryColor }}>
          {testimonial.metrics.value}
        </div>
        <div className="text-xs text-subtle-foreground">
          {testimonial.metrics.label}
        </div>
      </div>
    );
  };

  // Spotlight layout (featured testimonial)
  if (isSpotlight) {
    return (
      <Wrapper
        className={`relative rounded-3xl p-8 md:p-12 ${cardStyles[cardStyle]}`}
        style={cardStyle === "gradient-accent" ? { borderColor: primaryColor } : {}}
        {...wrapperProps}
      >
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          {/* Avatar & Author Info */}
          <div className="flex flex-col items-center text-center lg:w-1/3">
            <div className="mb-4">{renderAvatar()}</div>
            <h4 className="font-semibold text-foreground text-lg">
              {testimonial.author.name}
            </h4>
            {testimonial.author.role && (
              <p className="text-sm text-subtle-foreground">
                {testimonial.author.role}
              </p>
            )}
            {testimonial.author.company && (
              <p className="text-sm text-subtle-foreground">
                {testimonial.author.company}
              </p>
            )}
            {showLogo && testimonial.logo && (
              <img
                src={testimonial.logo}
                alt={testimonial.author.company}
                className="h-8 mt-4 opacity-60"
              />
            )}
          </div>

          {/* Quote */}
          <div className="lg:w-2/3">
            {renderRating()}
            {renderQuote()}
            {renderMetrics()}
          </div>
        </div>
      </Wrapper>
    );
  }

  // Default card layout
  return (
    <Wrapper
      className={`relative rounded-2xl p-6 h-full flex flex-col transition-all duration-300 hover:shadow-lg ${cardStyles[cardStyle]} ${
        testimonial.featured ? "ring-2 ring-offset-2 dark:ring-offset-zinc-950" : ""
      }`}
      style={{
        ...(cardStyle === "gradient-accent" ? { borderColor: primaryColor } : {}),
        ...(testimonial.featured ? { ringColor: primaryColor } : {}),
      }}
      {...wrapperProps}
    >
      {/* Rating */}
      {renderRating()}

      {/* Quote */}
      <div className="flex-1 mb-6">{renderQuote()}</div>

      {/* Metrics */}
      {renderMetrics()}

      {/* Author */}
      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
        {renderAvatar()}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">
            {testimonial.author.name}
          </h4>
          <div className="flex items-center gap-2 text-sm text-subtle-foreground">
            {testimonial.author.role && <span className="truncate">{testimonial.author.role}</span>}
            {testimonial.author.role && testimonial.author.company && <span>•</span>}
            {testimonial.author.company && (
              <span className="truncate">{testimonial.author.company}</span>
            )}
          </div>
        </div>
        {showDate && testimonial.date && (
          <span className="text-xs text-subtle-foreground">{testimonial.date}</span>
        )}
      </div>

      {/* Company logo */}
      {showLogo && testimonial.logo && (
        <div className="mt-4 pt-4 border-t border-border">
          <img
            src={testimonial.logo}
            alt={testimonial.author.company}
            className="h-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
          />
        </div>
      )}
    </Wrapper>
  );
}
