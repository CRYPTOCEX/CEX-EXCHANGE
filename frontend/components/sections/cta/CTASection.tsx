"use client";

import { useState, useRef, useMemo } from "react";
import {
  m,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowRight, Mail, Sparkles, Check, Rocket } from "lucide-react";
import { Link } from "@/i18n/routing";
import { CTASectionProps, CTAPreset, ctaPresets, CTACardConfig } from "./types";
import { SectionBackground } from "../shared";
import { paddingClasses, getColor, getGradient, withAlpha } from "../shared/types";
import { useTranslations } from "next-intl";

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
    <m.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle, ${withAlpha(color, 0.25)}, ${withAlpha(color, 0.06)}, transparent)`,
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
      <m.div
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
        <m.div
          className="absolute -inset-1 rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
          style={{
            /* CTACard is rendered only by `renderCardsVariant`, whose <section>
               carries a full-bleed accent gradient — so the secondary card's
               glow really is a white bloom on a saturated band. */
            background: isPrimary
              ? `linear-gradient(135deg, ${withAlpha(gradient.from, 0.38)}, ${withAlpha(gradient.to, 0.38)})`
              : "hsl(var(--overlay-foreground)/0.1)",
          }}
        />

        {/* Card */}
        <div
          className={`relative rounded-3xl p-8 overflow-hidden border backdrop-blur-xl h-full transition-all duration-300 ${
            isPrimary
              ? "border-primary-foreground/20 bg-card"
              : "border-border-strong/50 bg-surface-2/80 group-hover:border-border-strong/50"
          }`}
          style={{
            boxShadow: isPrimary
              ? `0 25px 60px -15px ${withAlpha(gradient.from, 0.25)}`
              : "0 25px 50px -12px hsl(var(--shadow) / 0.4)",
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
                background: `radial-gradient(ellipse at 50% 0%, ${withAlpha(gradient.from, 0.06)}, transparent 60%)`,
              }}
            />
          )}

          {/* Content */}
          <div className="relative z-10">
            {/* Header with icon and arrow */}
            <div className="flex items-start justify-between mb-6">
              {/* Icon */}
              <m.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: isPrimary
                    ? `linear-gradient(135deg, ${withAlpha(gradient.from, 0.13)}, ${withAlpha(gradient.to, 0.13)})`
                    : `linear-gradient(135deg, ${withAlpha(gradient.from, 0.08)}, ${withAlpha(gradient.to, 0.08)})`,
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Icon className="w-7 h-7" style={{ color: gradient.from }} />
              </m.div>

              {/* Arrow */}
              <m.div
                className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground group-hover:scale-110 transition-transform"
              >
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </m.div>
            </div>

            {/* Title */}
            <h3
              className="text-xl font-bold mb-3 text-foreground"
            >
              {title}
            </h3>

            {/* Description */}
            <p
              className="text-base leading-relaxed mb-6 text-muted-foreground"
            >
              {description}
            </p>

            {/* Button */}
            <div
              className={`w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center transition-all duration-300 ${
                isPrimary
                  ? "text-primary-foreground shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                  : "border-2 border-border-strong bg-transparent text-foreground hover:bg-muted hover:border-border-strong"
              }`}
              style={
                isPrimary
                  ? {
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      boxShadow: `0 10px 40px ${withAlpha(gradient.from, 0.25)}`,
                    }
                  : {}
              }
            >
              {buttonText}
              <FinalButtonIcon className="ml-2 h-5 w-5" />
            </div>
          </div>
        </div>
      </m.div>
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
            ? `linear-gradient(135deg, ${withAlpha(gradient.from, 0.87)}, ${withAlpha(gradient.to, 0.8)})`
            : `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        }}
      />

      {/* Animated overlay */}
      <m.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 0% 0%, ${withAlpha(gradient.from, soft ? 0.25 : 0.5)} 0%, transparent 50%)`,
        }}
        animate={{
          opacity: soft ? [0.2, 0.4, 0.2] : [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Moving gradient orb */}
      <m.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${withAlpha(gradient.to, soft ? 0.15 : 0.25)}, transparent 70%)`,
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

      {/* Grid pattern overlay. Sits directly on this component's own accent
          gradient (the base fill above), so the rule really is white-on-band. */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--overlay-foreground)/0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--overlay-foreground)/0.1) 1px, transparent 1px)
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
  const t = useTranslations("components");
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
    default: "bg-card",
    bordered:
      "bg-card border border-border dark:border-border/50",
    elevated: "bg-card shadow-2xl shadow-shadow/[calc(0.25*var(--card-shadow-strength))] dark:shadow-surface-2/[calc(0.5*var(--card-shadow-strength))]",
    glass:
      "bg-card/60 dark:bg-card/5 backdrop-blur-xl border border-border/50 border-border",
    gradient: "relative overflow-hidden",
    premium:
      "bg-card dark:bg-surface-2/90 border border-border dark:border-border/50 backdrop-blur-xl",
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
        color: "hsl(var(--primary))",
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
              ? "text-primary-foreground/90 font-extrabold"
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
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
          style={{
            /* The `isGradientCard` arm is the one that sits on
               AnimatedGradientBg's accent slab; the other arm sits on page
               surface and is already tinted with the accent. Only the band arm
               is white, and it stays white — via the token. */
            background: isGradientCard
              ? "hsl(var(--overlay-foreground)/0.15)"
              : `linear-gradient(135deg, ${withAlpha(gradient.from, 0.08)}, ${withAlpha(gradient.to, 0.02)})`,
            border: isGradientCard
              ? "1px solid hsl(var(--overlay-foreground)/0.25)"
              : `1px solid ${withAlpha(gradient.from, 0.19)}`,
            color: isGradientCard
              ? "hsl(var(--overlay-foreground))"
              : gradient.from,
          }}
        >
          {content.tag.icon ? (
            <content.tag.icon className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{content.tag.text}</span>
        </m.div>
      )}

      <m.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
        className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-6 ${
          isGradientCard ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {renderTitle()}
      </m.h2>

      {content.subtitle && (
        <m.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className={`text-lg md:text-xl mb-8 max-w-2xl leading-relaxed ${
            isGradientCard
              ? "text-primary-foreground/90"
              : "text-muted-foreground"
          }`}
        >
          {content.subtitle}
        </m.p>
      )}

      {content.newsletter ? (
        <m.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          onSubmit={handleNewsletterSubmit}
          className="w-full max-w-md"
        >
          {submitted ? (
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-xl bg-success/20 border border-success/30 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 text-success" />
              <span className="text-success font-medium">
                {t("thanks_for_subscribing")}
              </span>
            </m.div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative group">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-current transition-colors"
                    style={{ color: email ? gradient.from : undefined }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      content.newsletter.placeholder || t("enter_your_email")
                    }
                    /* `border-border border-border-strong` — two border colours in
                       one plain string, so twMerge never ran and Tailwind's own
                       rule order decided the winner. `border-border-strong` is the
                       one that painted; the `border-border` beside it had always
                       been dead. Hidden from the conflict rule for its whole life
                       because the literal wraps across lines and the rule's window
                       excluded newlines. */
                    className="w-full pl-12 pr-4 py-4 rounded-lg border border-border-strong
 bg-card text-foreground
 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: email ? gradient.from : undefined,
                      boxShadow: email
                        ? `0 0 0 3px ${withAlpha(gradient.from, 0.08)}`
                        : undefined,
                    }}
                    required
                  />
                </div>
                <m.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 rounded-xl font-semibold text-primary-foreground shadow-lg hover:shadow-xl
                    transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    boxShadow: `0 10px 30px ${withAlpha(gradient.from, 0.19)}`,
                  }}
                >
                  <span className="relative z-10">
                    {isSubmitting
                      ? `${t("subscribing")}…`
                      : content.newsletter.buttonText || t("subscribe")}
                  </span>
                  <m.div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.to}, ${gradient.from})`,
                    }}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </m.button>
              </div>
              {content.newsletter.privacyText && (
                <p
                  className={`text-xs mt-4 ${isGradientCard ? "text-primary-foreground/70" : "text-subtle-foreground"}`}
                >
                  {content.newsletter.privacyText}
                </p>
              )}
            </>
          )}
        </m.form>
      ) : content.buttons && content.buttons.length > 0 ? (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-4"
        >
          {content.buttons.map((button, idx) => (
            <m.div
              key={idx}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={button.href || "#"}
                className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  button.variant === "outline"
                    ? isGradientCard
                      ? "border-2 border-primary-foreground/40 text-primary-foreground hover:bg-overlay/20 hover:border-primary-foreground/60"
                      : "border-2 hover:bg-muted"
                    : button.variant === "secondary"
                      ? "bg-muted text-foreground hover:bg-muted"
                      : isGradientCard
                        ? "bg-card text-foreground hover:bg-card/95"
                        : "text-primary-foreground shadow-lg hover:shadow-xl"
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
                          boxShadow: `0 10px 30px ${withAlpha(gradient.from, 0.19)}`,
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
            </m.div>
          ))}
        </m.div>
      ) : null}

      {content.customContent && (
        <m.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          {content.customContent}
        </m.div>
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
        <m.div
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
            alt={t("cta_visual")}
            className="relative w-full h-full object-cover"
          />
        </m.div>
      );
    }

    if (type === "icon" && Icon) {
      return (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-64 h-64 rounded-3xl flex items-center justify-center relative group overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${withAlpha(gradient.from, 0.08)}, ${withAlpha(gradient.to, 0.08)})`,
            border: `1px solid ${withAlpha(gradient.from, 0.15)}`,
          }}
        >
          {/* Animated background */}
          <m.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${withAlpha(gradient.from, 0.19)}, transparent 70%)`,
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
        </m.div>
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
      <m.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 100 }}
        className={`relative rounded-3xl overflow-hidden ${extraClasses}`}
        style={{
          boxShadow: isGradientStyle
            ? `0 30px 60px ${withAlpha(gradient.from, isSoftGradient ? 0.13 : 0.19)}`
            : "0 20px 50px hsl(var(--shadow) / 0.1)",
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
      </m.div>
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
          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 50%, ${withAlpha(gradient.from, 0.87)} 100%)`,
        }}
      >
        {/* Animated background orbs */}
        {ctaOrbs.map((orb, i) => (
          <FloatingOrb key={i} {...orb} />
        ))}

        {/* Mesh gradient overlay. Both lobes shade this section's own accent
            gradient (see the <section> style above): the light lobe is a
            highlight ON the band, the dark lobe is a scrim on it — which is
            what `--overlay` is, and what the tag/trust chips below already
            use as `bg-overlay/20`. */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(ellipse at 20% 30%, hsl(var(--overlay-foreground)/0.2) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 70%, hsl(var(--overlay)/0.2) 0%, transparent 50%)
            `,
          }}
        />

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, hsl(var(--overlay-foreground)) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            {/* Left side - Text content */}
            <m.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Tag */}
              {content.tag && (
                <m.div
                  /*
                    This pill sits on the full-bleed accent ground and carries
                    `primary-foreground` (white) ink. Its fill was `card/10` —
                    and `--card` is WHITE in light mode, so the pill was
                    LIGHTENING the very ground its white text had to stand out
                    from, measured 2.99:1. `--overlay` is dark in both themes,
                    which is what a scrim on a saturated ground has to be.
                  */
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 bg-overlay/20 backdrop-blur-sm border border-primary-foreground/30"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  {content.tag.icon ? (
                    <content.tag.icon className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  )}
                  <span className="text-sm font-medium text-primary-foreground">
                    {content.tag.text}
                  </span>
                </m.div>
              )}

              {/* Title */}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
                {content.title}
                {content.titleHighlight && (
                  <>
                    <br />
                    <span className="text-primary-foreground/90">{content.titleHighlight}</span>
                  </>
                )}
              </h2>

              {/* Description */}
              {content.subtitle && (
                <p className="text-xl text-primary-foreground/80 mb-10 leading-relaxed max-w-xl">
                  {content.subtitle}
                </p>
              )}

              {/* Trust indicators */}
              {content.trustItems && content.trustItems.length > 0 && (
                <m.div
                  className="grid grid-cols-2 gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  {content.trustItems.map((item, i) => (
                    <m.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-center gap-3 text-primary-foreground/90"
                    >
                      <div className="w-8 h-8 rounded-lg bg-overlay/20 backdrop-blur-sm flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span className="text-sm font-medium">{item.text}</span>
                    </m.div>
                  ))}
                </m.div>
              )}

              {/* Decorative line */}
              <m.div
                className="mt-12 h-px w-full max-w-md"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--overlay-foreground)/0.3), transparent)",
                }}
                initial={{ scaleX: 0, originX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
              />
            </m.div>

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
              <m.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col items-center lg:items-start gap-6"
              >
                {/* Buttons container */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full">
                  {content.buttons.map((button, idx) => (
                    <m.div
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
                            ? "border-2 border-primary-foreground/40 text-primary-foreground hover:bg-overlay/20 hover:border-primary-foreground/60 backdrop-blur-sm"
                            : button.variant === "secondary"
                              ? "bg-surface-2/80 text-primary-foreground hover:bg-muted backdrop-blur-sm border border-border-strong/50"
                              : "bg-card text-foreground"
                        }`}
                        style={
                          button.variant !== "outline" && button.variant !== "secondary"
                            ? { boxShadow: "0 20px 40px hsl(var(--shadow) / 0.2)" }
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
                    </m.div>
                  ))}
                </div>

                {/* Custom content below buttons if provided */}
                {content.customContent && (
                  <m.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="w-full"
                  >
                    {content.customContent}
                  </m.div>
                )}
              </m.div>
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
      className={`relative ${paddingClasses[size] || sizeClasses[size]} overflow-hidden bg-muted  ${className}`}
    >
      {background && <SectionBackground config={background} theme={theme} />}

      {/* Background parallax effect */}
      <m.div
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
      </m.div>

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
        <m.div
          className="flex justify-center mt-12 gap-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {[...Array(5)].map((_, i) => (
            <m.div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === 2 ? "" : "bg-muted"
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
        </m.div>
      )}
    </section>
  );
}
