"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SectionHeaderConfig, ThemeConfig, getColor, getGradient } from "./types";

interface SectionHeaderProps {
  config: SectionHeaderConfig;
  theme?: ThemeConfig;
  animate?: boolean;
  className?: string;
}

export default function SectionHeader({
  config,
  theme = { primary: "teal", secondary: "cyan" },
  animate = true,
  className = "",
}: SectionHeaderProps) {
  const { tag, title, titleHighlight, titleHighlightGradient, subtitle, alignment = "center" } = config;

  const alignmentClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  };

  const primaryColor = getColor(theme.primary || "teal");
  const gradient = titleHighlightGradient
    ? getGradient(titleHighlightGradient)
    : getGradient(theme.primary || "teal");

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        type: "spring" as const,
        stiffness: 100,
      },
    },
  };

  const renderTitle = () => {
    if (!titleHighlight) {
      return title;
    }

    const parts = title.split(titleHighlight);
    return (
      <>
        {parts[0]}
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.via}, ${gradient.to})`,
          }}
        >
          {titleHighlight}
        </span>
        {parts[1]}
      </>
    );
  };

  const Wrapper = animate ? motion.div : "div";
  const wrapperProps = animate
    ? {
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, margin: "-100px" },
        variants: {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 },
          },
        },
      }
    : {};

  const Item = animate ? motion.div : "div";
  const itemProps = animate ? { variants: itemVariants } : {};

  return (
    <Wrapper
      className={`flex flex-col ${alignmentClasses[alignment]} mb-16 md:mb-20 ${className}`}
      {...wrapperProps}
    >
      {/* Tag */}
      {tag && (
        <Item {...itemProps}>
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{
              background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}05)`,
              border: `1px solid ${gradient.from}30`,
              color: gradient.from,
            }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {tag.icon ? <tag.icon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{tag.text}</span>
          </motion.div>
        </Item>
      )}

      {/* Title */}
      <Item {...itemProps}>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white tracking-tight">
          {renderTitle()}
        </h2>
      </Item>

      {/* Subtitle */}
      {subtitle && (
        <Item {...itemProps}>
          <p className="mt-6 text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </Item>
      )}

      {/* Decorative element */}
      {animate && (
        <Item {...itemProps}>
          <motion.div
            className="flex items-center gap-2 mt-8"
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div
              className="h-px w-12"
              style={{
                background: `linear-gradient(90deg, transparent, ${gradient.from})`,
              }}
            />
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div
              className="h-px w-12"
              style={{
                background: `linear-gradient(90deg, ${gradient.to}, transparent)`,
              }}
            />
          </motion.div>
        </Item>
      )}
    </Wrapper>
  );
}
