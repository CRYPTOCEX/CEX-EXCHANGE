"use client";

import { useRef, useMemo } from "react";
import { motion, useMotionValue, useTransform, useInView } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { ProcessSectionProps, ProcessPreset, processPresets } from "./types";
import { SectionBackground, SectionHeader } from "../shared";
import {
  paddingClasses,
  gapClasses,
  getColor,
  getGradient,
} from "../shared/types";

interface ProcessSectionComponentProps extends ProcessSectionProps {
  preset?: ProcessPreset;
}

// Floating particle component
function FloatingParticle({
  delay,
  duration,
  size,
  color,
  startX,
  startY,
  xOffset,
  repeatDelay,
}: {
  delay: number;
  duration: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  xOffset: number;
  repeatDelay: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: color,
        left: `${startX}%`,
        top: `${startY}%`,
        filter: "blur(1px)",
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0.5],
        y: [-20, -100],
        x: [0, xOffset],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay,
        ease: "easeOut",
      }}
    />
  );
}

// Animated connecting line between steps
function ConnectingLine({
  isActive,
  gradient,
  isVertical = false,
}: {
  isActive: boolean;
  gradient: { from: string; to: string };
  isVertical?: boolean;
}) {
  if (isVertical) {
    return (
      <div className="flex flex-col items-center py-2">
        <div className="relative w-px h-12">
          <div className="absolute inset-0 bg-zinc-300 dark:bg-zinc-700" />
          <motion.div
            className="absolute inset-x-0 top-0 origin-top"
            style={{
              background: `linear-gradient(180deg, ${gradient.from}, ${gradient.to})`,
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: isActive ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:block flex-1 mx-4 relative h-px">
      <div className="absolute inset-0 bg-zinc-300 dark:bg-zinc-700" />
      <motion.div
        className="absolute inset-y-0 left-0 origin-left"
        style={{
          background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isActive ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
          boxShadow: `0 0 20px ${gradient.from}80`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      />
    </div>
  );
}

// Premium step card with 3D effects
function StepCard({
  step,
  index,
  gradient,
  primaryColor,
  iconStyle,
  iconSize,
  cardStyle,
  showNumbers,
  animate = true,
}: {
  step: any;
  index: number;
  gradient: { from: string; to: string };
  primaryColor: string;
  iconStyle: string;
  iconSize: string;
  cardStyle: string;
  showNumbers: boolean;
  animate?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);

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

  // Generate particles for this card - using deterministic values based on index to avoid hydration mismatch
  const particles = useMemo(() => {
    // Seeded pseudo-random function for deterministic values
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    // Round to 2 decimal places to ensure server/client consistency
    const round = (n: number) => Math.round(n * 100) / 100;

    return Array.from({ length: 6 }, (_, i) => {
      const seed = index * 100 + i;
      return {
        id: i,
        delay: round(i * 0.5 + index * 0.2),
        duration: round(2 + seededRandom(seed) * 1),
        size: round(3 + seededRandom(seed + 1) * 4),
        color: `${gradient.from}${Math.floor(seededRandom(seed + 2) * 40 + 30).toString(16)}`,
        startX: round(20 + seededRandom(seed + 3) * 60),
        startY: round(70 + seededRandom(seed + 4) * 20),
        xOffset: round(seededRandom(seed + 5) * 40 - 20),
        repeatDelay: round(seededRandom(seed + 6) * 2),
      };
    });
  }, [index, gradient.from]);

  const iconSizes: Record<string, string> = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-14 h-14",
    xl: "w-16 h-16",
  };

  const cardStyles: Record<string, string> = {
    default: "bg-white dark:bg-zinc-900",
    bordered:
      "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50",
    glass:
      "bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10",
    gradient: "bg-white dark:bg-zinc-900/80",
    premium:
      "bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/50 backdrop-blur-xl",
  };

  const Icon = step.icon;

  return (
    <motion.div
      ref={cardRef}
      initial={animate ? { opacity: 0, y: 50, scale: 0.9 } : undefined}
      whileInView={animate ? { opacity: 1, y: 0, scale: 1 } : undefined}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        type: "spring",
        stiffness: 100,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -8, scale: 1.02 }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
      className="relative group h-full"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${gradient.from}40, ${gradient.to}40)`,
        }}
      />

      {/* Card */}
      <div
        className={`relative h-full rounded-2xl p-6 overflow-hidden ${cardStyles[cardStyle] || cardStyles.premium}`}
        style={{
          boxShadow: `0 15px 40px -10px rgba(0,0,0,0.1)`,
        }}
      >
        {/* Engraved number in background - top right */}
        {showNumbers && (
          <div className="absolute right-3 top-3 select-none pointer-events-none">
            <span
              className="text-5xl font-black leading-none block transition-all duration-500 opacity-[0.08] dark:opacity-[0.12] group-hover:opacity-25 dark:group-hover:opacity-35"
              style={{
                color: gradient.from,
              }}
            >
              {String(step.number || index + 1).padStart(2, "0")}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-40 transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at 30% 0%, ${gradient.from}30 0%, transparent 60%)`,
          }}
        />

        {/* Floating particles */}
        {particles.map((p) => (
          <FloatingParticle key={p.id} {...p} />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Icon container with animated glow */}
          <motion.div
            className={`relative ${iconSizes[iconSize] || iconSizes.md} mb-4`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div
              className="absolute inset-0 rounded-xl blur-lg opacity-40 dark:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
            />
            <div
              className="relative w-full h-full rounded-xl flex items-center justify-center"
              style={
                iconStyle === "filled"
                  ? {
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      boxShadow: `0 8px 24px ${gradient.from}30`,
                    }
                  : iconStyle === "outlined"
                    ? {
                        background: "transparent",
                        border: `2px solid ${primaryColor}`,
                      }
                    : {
                        background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
                        border: `1px solid ${gradient.from}25`,
                      }
              }
            >
              {Icon ? (
                <Icon
                  className="w-1/2 h-1/2"
                  style={{
                    color: iconStyle === "filled" ? "white" : gradient.from,
                  }}
                  strokeWidth={1.5}
                />
              ) : step.iconElement ? (
                step.iconElement
              ) : (
                <CheckCircle2
                  className="w-1/2 h-1/2"
                  style={{
                    color: iconStyle === "filled" ? "white" : gradient.from,
                  }}
                  strokeWidth={1.5}
                />
              )}
            </div>
          </motion.div>

          {/* Badge */}
          {step.badge && (
            <span
              className="inline-flex px-3 py-1 rounded-full text-xs font-semibold mb-3 w-fit"
              style={{
                background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
                color: gradient.from,
              }}
            >
              {step.badge}
            </span>
          )}

          {/* Title */}
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Features list */}
          {step.features && step.features.length > 0 && (
            <ul className="space-y-2 mb-4 grow">
              {step.features.map((feature: string, i: number) => (
                <li
                  key={i}
                  className="flex items-center text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <CheckCircle2
                    className="w-4 h-4 mr-2 shrink-0"
                    style={{ color: gradient.from }}
                  />
                  {feature}
                </li>
              ))}
            </ul>
          )}

          {/* Image */}
          {step.image && (
            <div className="rounded-xl overflow-hidden mb-4">
              <img
                src={step.image}
                alt={step.title}
                className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}

          {/* Link */}
          {step.link && (
            <Link
              href={step.link.href}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors mt-auto"
              style={{ color: gradient.from }}
            >
              {step.link.text}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          {/* Decorative line */}
          <motion.div
            className="absolute bottom-0 left-6 right-6 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${gradient.from}30, transparent)`,
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
          />
        </div>

        {/* Corner accent */}
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-20"
          style={{
            background: `radial-gradient(circle at 100% 0%, ${gradient.to}40, transparent 70%)`,
          }}
        />
      </div>
    </motion.div>
  );
}

export default function ProcessSection({
  header,
  steps,
  layout,
  background,
  animation = { enabled: true },
  theme = { primary: "teal", secondary: "cyan" },
  className = "",
  preset,
  id,
}: ProcessSectionComponentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const presetConfig = preset ? processPresets[preset] : null;
  const finalLayout = { ...presetConfig?.layout, ...layout };

  const {
    variant = "horizontal",
    showNumbers = true,
    showConnectors = true,
    cardStyle = "premium",
    iconStyle = "gradient",
    iconSize = "md",
    gap = "lg",
  } = finalLayout;

  const primaryColor = getColor(theme.primary || "teal");
  const gradient = getGradient(theme.primary || "teal");

  // Gradient colors for different steps
  const gradientColors = [
    { from: "#14b8a6", to: "#10b981" }, // teal-emerald
    { from: "#06b6d4", to: "#0ea5e9" }, // cyan-sky
    { from: "#8b5cf6", to: "#a855f7" }, // violet-purple
    { from: "#f59e0b", to: "#f97316" }, // amber-orange
    { from: "#ec4899", to: "#f43f5e" }, // pink-rose
    { from: "#3b82f6", to: "#6366f1" }, // blue-indigo
  ];

  const columnsClasses: Record<number, string> = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-3 lg:grid-cols-6",
  };

  // Horizontal layout with animated connectors
  const renderHorizontal = () => (
    <div className="flex items-stretch justify-center flex-wrap lg:flex-nowrap gap-4">
      {steps.map((step, index) => {
        const stepGradient = gradientColors[index % gradientColors.length];
        return (
          <div
            key={step.id || index}
            className="flex items-center flex-1 min-w-[250px]"
          >
            <div className="flex-1 h-full">
              <StepCard
                step={step}
                index={index}
                gradient={stepGradient}
                primaryColor={primaryColor}
                iconStyle={iconStyle}
                iconSize={iconSize}
                cardStyle={cardStyle}
                showNumbers={showNumbers}
                animate={animation.enabled}
              />
            </div>
            {showConnectors && index < steps.length - 1 && (
              <ConnectingLine isActive={isInView} gradient={stepGradient} />
            )}
          </div>
        );
      })}
    </div>
  );

  // Timeline layout
  const renderTimeline = () => (
    <div className="max-w-4xl mx-auto">
      {steps.map((step, index) => {
        const stepGradient = gradientColors[index % gradientColors.length];
        return (
          <div key={step.id || index} className="relative">
            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <motion.div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white"
                  style={{
                    background: `linear-gradient(135deg, ${stepGradient.from}, ${stepGradient.to})`,
                  }}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: "spring" }}
                >
                  {step.number || index + 1}
                </motion.div>
                {showConnectors && index !== steps.length - 1 && (
                  <ConnectingLine
                    isActive={isInView}
                    gradient={stepGradient}
                    isVertical
                  />
                )}
              </div>
              <div className="flex-1 pb-8">
                <StepCard
                  step={step}
                  index={index}
                  gradient={stepGradient}
                  primaryColor={primaryColor}
                  iconStyle={iconStyle}
                  iconSize={iconSize}
                  cardStyle={cardStyle}
                  showNumbers={false}
                  animate={animation.enabled}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Zigzag layout
  const renderZigzag = () => (
    <div className="container mx-auto">
      {steps.map((step, index) => {
        const isEven = index % 2 === 0;
        const stepGradient = gradientColors[index % gradientColors.length];
        const Icon = step.icon;
        return (
          <motion.div
            key={step.id || index}
            initial={{ opacity: 0, x: isEven ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-8 mb-12`}
          >
            <div className="flex-1 w-full">
              <StepCard
                step={step}
                index={index}
                gradient={stepGradient}
                primaryColor={primaryColor}
                iconStyle={iconStyle}
                iconSize={iconSize}
                cardStyle={cardStyle}
                showNumbers={showNumbers}
                animate={animation.enabled}
              />
            </div>
            <div className="flex-1 flex justify-center">
              {step.image ? (
                <img
                  src={step.image}
                  alt={step.title}
                  className="rounded-2xl shadow-xl max-w-md"
                />
              ) : (
                <motion.div
                  className="w-64 h-64 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${stepGradient.from}10, ${stepGradient.to}10)`,
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div
                    className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(circle at center, ${stepGradient.from}, transparent 70%)`,
                    }}
                  />
                  {Icon && (
                    <Icon
                      className="w-24 h-24"
                      style={{ color: stepGradient.from }}
                      strokeWidth={1}
                    />
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  // Grid/Cards layout - Premium version with connector lines
  const renderGrid = () => {
    const cols = Math.min(steps.length, 4);
    return (
      <div className="container mx-auto">
        {/* Connector line behind cards - only visible on desktop */}
        {showConnectors && steps.length > 1 && (
          <div className="hidden md:block relative">
            <motion.div
              className="absolute top-32 left-[12%] right-[12%] h-px z-0"
              style={{
                background: `linear-gradient(90deg, transparent, ${gradient.from}50, ${gradient.to}50, transparent)`,
              }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            />
            {/* Animated dots on the line */}
            {steps.map((_, index) => {
              if (index === steps.length - 1) return null;
              const stepGradient =
                gradientColors[index % gradientColors.length];
              const position = ((index + 1) / steps.length) * 100;
              return (
                <motion.div
                  key={`dot-${index}`}
                  className="absolute top-32 w-3 h-3 rounded-full -translate-y-1/2 z-10 hidden lg:block"
                  style={{
                    left: `${position - 100 / steps.length / 2}%`,
                    background: `linear-gradient(135deg, ${stepGradient.from}, ${stepGradient.to})`,
                    boxShadow: `0 0 20px ${stepGradient.from}60`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.2 }}
                />
              );
            })}
          </div>
        )}
        <div
          className={`grid ${columnsClasses[cols] || columnsClasses[4]} ${gapClasses[gap]} relative z-10`}
        >
          {steps.map((step, index) => {
            const stepGradient = gradientColors[index % gradientColors.length];
            return (
              <div key={step.id || index} className="h-full relative">
                <StepCard
                  step={step}
                  index={index}
                  gradient={stepGradient}
                  primaryColor={primaryColor}
                  iconStyle={iconStyle}
                  iconSize={iconSize}
                  cardStyle={cardStyle}
                  showNumbers={showNumbers}
                  animate={animation.enabled}
                />
                {/* Mobile connector - vertical line between cards */}
                {showConnectors && index < steps.length - 1 && (
                  <motion.div
                    className="md:hidden flex justify-center py-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    <div
                      className="w-px h-8"
                      style={{
                        background: `linear-gradient(180deg, ${stepGradient.from}, ${stepGradient.to})`,
                      }}
                    />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Minimal layout
  const renderMinimal = () => {
    const cols = Math.min(steps.length, 4);
    return (
      <div
        className={`grid ${columnsClasses[cols] || columnsClasses[4]} ${gapClasses[gap]}`}
      >
        {steps.map((step, index) => {
          const stepGradient = gradientColors[index % gradientColors.length];
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id || index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="text-center group"
            >
              <motion.div
                className="mb-4 flex justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${stepGradient.from}15, ${stepGradient.to}15)`,
                    border: `1px solid ${stepGradient.from}25`,
                  }}
                >
                  {Icon ? (
                    <Icon
                      className="w-7 h-7"
                      style={{ color: stepGradient.from }}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <CheckCircle2
                      className="w-7 h-7"
                      style={{ color: stepGradient.from }}
                      strokeWidth={1.5}
                    />
                  )}
                </div>
              </motion.div>
              {showNumbers && (
                <span
                  className="text-xs font-bold mb-2 block"
                  style={{ color: stepGradient.from }}
                >
                  {String(step.number || index + 1).padStart(2, "0")}
                </span>
              )}
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    switch (variant) {
      case "horizontal":
        return renderHorizontal();
      case "timeline":
        return renderTimeline();
      case "zigzag":
        return renderZigzag();
      case "cards":
      case "grid":
        return renderGrid();
      case "minimal":
        return renderMinimal();
      default:
        return renderGrid();
    }
  };

  // Progress dots decoration
  const renderProgressDots = () => (
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
  );

  // Check if we should use transparent background
  const hasTransparentBg =
    background?.variant === "transparent" ||
    className?.includes("bg-transparent");
  const bgClass = hasTransparentBg ? "" : "bg-zinc-50 dark:bg-zinc-950";

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative ${paddingClasses.lg} overflow-hidden ${bgClass} ${className}`}
    >
      {background && background.variant !== "transparent" && (
        <SectionBackground config={background} theme={theme} />
      )}

      <div className="container mx-auto relative z-10">
        {header && (
          <SectionHeader
            config={header}
            theme={theme}
            animate={animation.enabled}
          />
        )}
        {renderContent()}
        {renderProgressDots()}
      </div>
    </section>
  );
}
