"use client";

import { useState, useRef, useMemo } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowRight, Mail, Sparkles, Check, Rocket } from "lucide-react";
import { Link } from "@/i18n/routing";
import { CTASectionProps, CTAPreset, ctaPresets, CTACardConfig } from "./types";
import { SectionBackground } from "../shared";
import { paddingClasses, getColor, getGradient } from "../shared/types";

// Floating orb component
function FloatingOrb({
  size,
  color,
  delay,
  duration,
  x,
  y,
}: {
  size: number;
  color: string;
  delay: number;
  duration: number;
  x: string;
  y: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle, ${color}40, ${color}10, transparent)`,
        filter: "blur(40px)",
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// CTA Card component for "cards" variant - with 3D tilt effect
function CTACard({
  variant,
  icon: Icon,
  title,
  description,
  buttonText,
  href,
  gradient,
  buttonIcon: ButtonIcon,
  index,
}: CTACardConfig & {
  gradient: { from: string; to: string };
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

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
  };

  const isPrimary = variant === "primary";
  const FinalButtonIcon = ButtonIcon || (isPrimary ? ArrowRight : Rocket);

  return (
    <Link href={href} className="block">
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: index * 0.15 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformPerspective: 1200,
          transformStyle: "preserve-3d",
        }}
        className="relative group cursor-pointer"
      >
        {/* Animated glow */}
        <motion.div
          className="absolute -inset-1 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
          style={{
            background: isPrimary
              ? `linear-gradient(135deg, ${gradient.from}60, ${gradient.to}60)`
              : "rgba(255,255,255,0.1)",
          }}
        />

        {/* Card */}
        <div
          className={`relative rounded-3xl p-8 overflow-hidden border backdrop-blur-xl h-full transition-all duration-300 ${
            isPrimary
              ? "border-white/20 bg-white"
              : "border-zinc-700/50 bg-zinc-900/80 group-hover:border-zinc-600/50"
          }`}
          style={{
            boxShadow: isPrimary
              ? `0 25px 60px -15px ${gradient.from}40`
              : "0 25px 50px -12px rgba(0,0,0,0.4)",
          }}
        >
          {/* Background effects for primary */}
          {isPrimary && (
            <>
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                }}
              />
              <div
                className="absolute top-0 right-0 w-64 h-64 opacity-10"
                style={{
                  background: `radial-gradient(circle at 100% 0%, ${gradient.to}, transparent 70%)`,
                }}
              />
            </>
          )}

          {/* Background effects for secondary */}
          {!isPrimary && (
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, ${gradient.from}10, transparent 60%)`,
              }}
            />
          )}

          {/* Content */}
          <div className="relative z-10">
            {/* Header with icon and arrow */}
            <div className="flex items-start justify-between mb-6">
              {/* Icon */}
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: isPrimary
                    ? `linear-gradient(135deg, ${gradient.from}20, ${gradient.to}20)`
                    : `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Icon className="w-7 h-7" style={{ color: gradient.from }} />
              </motion.div>

              {/* Arrow */}
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isPrimary
                    ? "bg-zinc-100 text-zinc-600"
                    : "bg-zinc-800 text-zinc-400"
                } group-hover:scale-110 transition-transform`}
              >
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </motion.div>
            </div>

            {/* Title */}
            <h3
              className={`text-xl font-bold mb-3 ${
                isPrimary ? "text-zinc-900" : "text-white"
              }`}
            >
              {title}
            </h3>

            {/* Description */}
            <p
              className={`text-base leading-relaxed mb-6 ${
                isPrimary ? "text-zinc-600" : "text-zinc-400"
              }`}
            >
              {description}
            </p>

            {/* Button */}
            <div
              className={`w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center transition-all duration-300 ${
                isPrimary
                  ? "text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                  : "border-2 border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:border-zinc-600"
              }`}
              style={
                isPrimary
                  ? {
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      boxShadow: `0 10px 40px ${gradient.from}40`,
                    }
                  : {}
              }
            >
              {buttonText}
              <FinalButtonIcon className="ml-2 h-5 w-5" />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Animated gradient background
function AnimatedGradientBg({
  gradient,
  soft = false,
}: {
  gradient: { from: string; to: string };
  soft?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: soft
            ? `linear-gradient(135deg, ${gradient.from}dd, ${gradient.to}cc)`
            : `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        }}
      />

      {/* Animated overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 0% 0%, ${gradient.from}${soft ? "40" : "80"} 0%, transparent 50%)`,
        }}
        animate={{
          opacity: soft ? [0.2, 0.4, 0.2] : [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Moving gradient orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${gradient.to}${soft ? "25" : "40"}, transparent 70%)`,
          filter: "blur(60px)",
        }}
        animate={{
          x: ["-20%", "100%"],
          y: ["-20%", "80%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

interface CTASectionComponentProps extends CTASectionProps {
  preset?: CTAPreset;
}

export default function CTASection({
  content,
  layout,
  background,
  animation = { enabled: true },
  theme = { primary: "teal", secondary: "cyan" },
  className = "",
  preset,
  id,
}: CTASectionComponentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const presetConfig = preset ? ctaPresets[preset] : null;
  const finalLayout = { ...presetConfig?.layout, ...layout };

  const { scrollYProgress } = useScroll({
    offset: ["start end", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const {
    variant = "centered",
    size = "lg",
    alignment = "center",
    visualPosition = "right",
    cardStyle = "premium",
    fullWidth = false,
    showDots = true,
    actionStyle = "cards",
  } = finalLayout;

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const primaryColor = getColor(theme.primary || "teal");
  const gradient = getGradient(theme.primary || "teal");

  const sizeClasses = {
    sm: "py-8",
    md: "py-12",
    lg: "py-16",
    xl: "py-24",
  };

  const alignmentClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  };

  const cardStyles: Record<string, string> = {
    default: "bg-white dark:bg-zinc-900",
    bordered:
      "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50",
    elevated: "bg-white dark:bg-zinc-900 shadow-2xl dark:shadow-zinc-900/50",
    glass:
      "bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10",
    gradient: "relative overflow-hidden",
    premium:
      "bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/50 backdrop-blur-xl",
  };

  // CTA orbs for cards variant
  const ctaOrbs = useMemo(
    () => [
      {
        size: 300,
        color: gradient.from,
        delay: 0,
        duration: 8,
        x: "10%",
        y: "20%",
      },
      {
        size: 200,
        color: gradient.to,
        delay: 2,
        duration: 10,
        x: "80%",
        y: "60%",
      },
      {
        size: 250,
        color: "#8b5cf6",
        delay: 4,
        duration: 12,
        x: "60%",
        y: "10%",
      },
      {
        size: 180,
        color: gradient.from,
        delay: 1,
        duration: 9,
        x: "30%",
        y: "70%",
      },
    ],
    [gradient.from, gradient.to]
  );

  // Floating orbs configuration (for non-cards variants)
  const floatingOrbs = [
    {
      size: 300,
      color: gradient.from,
      delay: 0,
      duration: 8,
      x: "10%",
      y: "20%",
    },
    {
      size: 200,
      color: gradient.to,
      delay: 2,
      duration: 10,
      x: "70%",
      y: "60%",
    },
    {
      size: 150,
      color: gradient.from,
      delay: 4,
      duration: 12,
      x: "80%",
      y: "10%",
    },
    {
      size: 100,
      color: gradient.to,
      delay: 1,
      duration: 9,
      x: "20%",
      y: "70%",
    },
  ];

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (content.newsletter?.onSubmit) {
        await content.newsletter.onSubmit(email);
      }
      setSubmitted(true);
      setEmail("");
    } catch (error) {
      console.error("Newsletter signup failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGradientCard =
    cardStyle === "gradient" || cardStyle === "gradient-soft";

  const renderTitle = () => {
    if (!content.titleHighlight) {
      return content.title;
    }

    const parts = content.title.split(content.titleHighlight);
    return (
      <>
        {parts[0]}
        <span
          className={
            isGradientCard
              ? "text-white/90 font-extrabold"
              : "bg-clip-text text-transparent"
          }
          style={
            isGradientCard
              ? {}
              : {
                  backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.via}, ${gradient.to})`,
                }
          }
        >
          {content.titleHighlight}
        </span>
        {parts[1]}
      </>
    );
  };

  const renderContent = () => (
    <div className={`flex flex-col ${alignmentClasses[alignment]}`}>
      {content.tag && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
          style={{
            background: isGradientCard
              ? "rgba(255,255,255,0.15)"
              : `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}05)`,
            border: isGradientCard
              ? "1px solid rgba(255,255,255,0.25)"
              : `1px solid ${gradient.from}30`,
            color: isGradientCard ? "white" : gradient.from,
          }}
        >
          {content.tag.icon ? (
            <content.tag.icon className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{content.tag.text}</span>
        </motion.div>
      )}

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
        className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-6 ${
          isGradientCard ? "text-white" : "text-zinc-900 dark:text-white"
        }`}
      >
        {renderTitle()}
      </motion.h2>

      {content.subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className={`text-lg md:text-xl mb-8 max-w-2xl leading-relaxed ${
            isGradientCard
              ? "text-white/90"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {content.subtitle}
        </motion.p>
      )}

      {content.newsletter ? (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          onSubmit={handleNewsletterSubmit}
          className="w-full max-w-md"
        >
          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-400 font-medium">
                Thanks for subscribing!
              </span>
            </motion.div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative group">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-current transition-colors"
                    style={{ color: email ? gradient.from : undefined }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      content.newsletter.placeholder || "Enter your email"
                    }
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700
                      bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white
                      focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: email ? gradient.from : undefined,
                      boxShadow: email
                        ? `0 0 0 3px ${gradient.from}15`
                        : undefined,
                    }}
                    required
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl
                    transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    boxShadow: `0 10px 30px ${gradient.from}30`,
                  }}
                >
                  <span className="relative z-10">
                    {isSubmitting
                      ? "Subscribing..."
                      : content.newsletter.buttonText || "Subscribe"}
                  </span>
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.to}, ${gradient.from})`,
                    }}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              </div>
              {content.newsletter.privacyText && (
                <p
                  className={`text-xs mt-4 ${isGradientCard ? "text-white/70" : "text-zinc-500 dark:text-zinc-400"}`}
                >
                  {content.newsletter.privacyText}
                </p>
              )}
            </>
          )}
        </motion.form>
      ) : content.buttons && content.buttons.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-4"
        >
          {content.buttons.map((button, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={button.href || "#"}
                className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  button.variant === "outline"
                    ? isGradientCard
                      ? "border-2 border-white/40 text-white hover:bg-white/10 hover:border-white/60"
                      : "border-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    : button.variant === "secondary"
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      : isGradientCard
                        ? "bg-white text-zinc-900 shadow-lg hover:shadow-xl hover:bg-white/95"
                        : "text-white shadow-lg hover:shadow-xl"
                }`}
                style={
                  button.variant === "outline" && !isGradientCard
                    ? {
                        borderColor: primaryColor,
                        color: primaryColor,
                      }
                    : button.variant !== "secondary" &&
                        button.variant !== "outline" &&
                        !isGradientCard
                      ? {
                          background:
                            button.gradient ||
                            `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                          boxShadow: `0 10px 30px ${gradient.from}30`,
                        }
                      : {}
                }
              >
                {button.icon && button.iconPosition === "left" && (
                  <button.icon className="w-5 h-5" />
                )}
                {button.text}
                {button.icon && button.iconPosition === "right" && (
                  <button.icon className="w-5 h-5" />
                )}
                {!button.icon && (
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                )}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : null}

      {content.customContent && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          {content.customContent}
        </motion.div>
      )}
    </div>
  );

  const renderVisual = () => {
    if (!content.visual) return null;

    const { type, src, icon: Icon, content: customContent } = content.visual;

    if (type === "custom" && customContent) {
      return customContent;
    }

    if (type === "image" && src) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100 }}
          whileHover={{ scale: 1.02 }}
          className="rounded-2xl overflow-hidden shadow-2xl relative group"
        >
          {/* Glow effect */}
          <div
            className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 blur-xl"
            style={{
              background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
            }}
          />
          <img
            src={src}
            alt="CTA visual"
            className="relative w-full h-full object-cover"
          />
        </motion.div>
      );
    }

    if (type === "icon" && Icon) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-64 h-64 rounded-3xl flex items-center justify-center relative group overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
            border: `1px solid ${gradient.from}25`,
          }}
        >
          {/* Animated background */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${gradient.from}30, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <Icon
            className="w-32 h-32 relative z-10"
            style={{ color: gradient.from }}
            strokeWidth={1}
          />
        </motion.div>
      );
    }

    return null;
  };

  const containerClasses = fullWidth ? "w-full" : "container mx-auto px-4";
  const innerClasses = fullWidth ? "" : "container mx-auto";

  // Render card wrapper with optional floating orbs
  const renderCardWrapper = (
    children: React.ReactNode,
    extraClasses: string = ""
  ) => {
    const isGradientStyle =
      cardStyle === "gradient" || cardStyle === "gradient-soft";
    const isSoftGradient = cardStyle === "gradient-soft";

    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 100 }}
        className={`relative rounded-3xl overflow-hidden ${extraClasses}`}
        style={{
          boxShadow: isGradientStyle
            ? `0 30px 60px ${gradient.from}${isSoftGradient ? "20" : "30"}`
            : "0 20px 50px rgba(0,0,0,0.1)",
        }}
      >
        {/* Animated gradient background for gradient style */}
        {isGradientStyle && (
          <AnimatedGradientBg
            gradient={{ from: gradient.from, to: gradient.to }}
            soft={isSoftGradient}
          />
        )}

        {/* Floating orbs for non-gradient styles */}
        {!isGradientStyle && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {floatingOrbs.map((orb, i) => (
              <FloatingOrb key={i} {...orb} />
            ))}
          </div>
        )}

        {/* Card content */}
        <div
          className={`relative z-10 ${!isGradientStyle ? cardStyles[cardStyle] : ""}`}
        >
          {children}
        </div>
      </motion.div>
    );
  };

  // Render "cards" variant - ICO-style CTA with two-column layout
  const renderCardsVariant = () => {
    const secondaryGradient = getGradient(theme.secondary || "cyan");

    return (
      <section
        ref={sectionRef}
        id={id}
        className={`py-32 relative overflow-hidden ${className}`}
        style={{
          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 50%, ${gradient.from}dd 100%)`,
        }}
      >
        {/* Animated background orbs */}
        {ctaOrbs.map((orb, i) => (
          <FloatingOrb key={i} {...orb} />
        ))}

        {/* Mesh gradient overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.2) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.2) 0%, transparent 50%)
            `,
          }}
        />

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, white 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            {/* Left side - Text content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Tag */}
              {content.tag && (
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 bg-white/10 backdrop-blur-sm border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  {content.tag.icon ? (
                    <content.tag.icon className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                  <span className="text-sm font-medium text-white">
                    {content.tag.text}
                  </span>
                </motion.div>
              )}

              {/* Title */}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {content.title}
                {content.titleHighlight && (
                  <>
                    <br />
                    <span className="text-white/90">{content.titleHighlight}</span>
                  </>
                )}
              </h2>

              {/* Description */}
              {content.subtitle && (
                <p className="text-xl text-white/80 mb-10 leading-relaxed max-w-xl">
                  {content.subtitle}
                </p>
              )}

              {/* Trust indicators */}
              {content.trustItems && content.trustItems.length > 0 && (
                <motion.div
                  className="grid grid-cols-2 gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  {content.trustItems.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-center gap-3 text-white/90"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{item.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Decorative line */}
              <motion.div
                className="mt-12 h-px w-full max-w-md"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.3), transparent)",
                }}
                initial={{ scaleX: 0, originX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
              />
            </motion.div>

            {/* Right side - CTA Cards or Buttons */}
            {actionStyle === "cards" && content.cards && content.cards.length > 0 ? (
              <div className="space-y-6">
                {content.cards.map((card, index) => (
                  <CTACard
                    key={index}
                    {...card}
                    gradient={
                      card.gradient ||
                      (card.variant === "primary"
                        ? { from: gradient.from, to: gradient.to }
                        : { from: secondaryGradient.from, to: secondaryGradient.to })
                    }
                    index={index}
                  />
                ))}
              </div>
            ) : actionStyle === "buttons" && content.buttons && content.buttons.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col items-center lg:items-start gap-6"
              >
                {/* Buttons container */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full">
                  {content.buttons.map((button, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 min-w-[200px]"
                    >
                      <Link
                        href={button.href || "#"}
                        className={`flex items-center justify-center gap-3 w-full px-8 py-5 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                          button.variant === "outline"
                            ? "border-2 border-white/40 text-white hover:bg-white/10 hover:border-white/60 backdrop-blur-sm"
                            : button.variant === "secondary"
                              ? "bg-zinc-900/80 text-white hover:bg-zinc-800 backdrop-blur-sm border border-zinc-700/50"
                              : "bg-white text-zinc-900 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                        }`}
                        style={
                          button.variant !== "outline" && button.variant !== "secondary"
                            ? { boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }
                            : {}
                        }
                      >
                        {button.icon && button.iconPosition === "left" && (
                          <button.icon className="w-5 h-5" />
                        )}
                        {button.text}
                        {button.icon && button.iconPosition === "right" && (
                          <button.icon className="w-5 h-5" />
                        )}
                        {!button.icon && (
                          <ArrowRight className="w-5 h-5" />
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Custom content below buttons if provided */}
                {content.customContent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="w-full"
                  >
                    {content.customContent}
                  </motion.div>
                )}
              </motion.div>
            ) : null}
          </div>
        </div>
      </section>
    );
  };

  // If variant is "cards", render the ICO-style layout
  if (variant === "cards") {
    return renderCardsVariant();
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative ${paddingClasses[size] || sizeClasses[size]} overflow-hidden bg-zinc-50 dark:bg-zinc-950 ${className}`}
    >
      {background && <SectionBackground config={background} theme={theme} />}

      {/* Background parallax effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: backgroundY }}
      >
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10"
          style={{
            background: `radial-gradient(circle, ${gradient.from}, transparent 70%)`,
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10"
          style={{
            background: `radial-gradient(circle, ${gradient.to}, transparent 70%)`,
          }}
        />
      </motion.div>

      <div className={containerClasses}>
        <div className={innerClasses}>
          {variant === "split" && content.visual
            ? renderCardWrapper(
                <div className="p-8 md:p-12">
                  <div
                    className={`flex flex-col ${visualPosition === "left" ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12`}
                  >
                    <div className="flex-1">{renderContent()}</div>
                    <div className="flex-1">{renderVisual()}</div>
                  </div>
                </div>
              )
            : variant === "banner"
              ? renderCardWrapper(
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex-1">{renderContent()}</div>
                    </div>
                  </div>
                )
              : renderCardWrapper(
                  <div className="p-8 md:p-12 lg:p-16">{renderContent()}</div>
                )}
        </div>
      </div>

      {/* Bottom decoration - optional */}
      {showDots && (
        <motion.div
          className="flex justify-center mt-12 gap-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === 2 ? "" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
              style={
                i === 2
                  ? {
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    }
                  : {}
              }
              animate={
                i === 2 ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] } : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            />
          ))}
        </motion.div>
      )}
    </section>
  );
}
