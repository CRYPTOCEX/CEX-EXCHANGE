"use client";

import { ReactNode } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { Link } from "@/i18n/routing";

interface PageHeroProps {
  badge?: {
    icon?: ReactNode;
    text: string;
  };
  title: string | { text: string; gradient?: string }[];
  description?: string;
  children?: ReactNode;
  backLink?: {
    href: string;
    label: string;
  };
}

export function PageHero({ badge, title, description, children, backLink }: PageHeroProps) {
  // Convert string title to array format
  const titleConfig = typeof title === "string"
    ? [{ text: title }]
    : title;

  return (
    <HeroSection
      badge={
        badge
          ? {
              icon: badge.icon || <Sparkles className="h-3.5 w-3.5" />,
              text: badge.text,
              gradient: "from-indigo-600/10 to-purple-600/10",
              iconColor: "text-indigo-600",
              textColor: "text-indigo-700 dark:text-indigo-400",
            }
          : undefined
      }
      title={titleConfig}
      description={description}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="centered"
      maxWidth="max-w-3xl"
      titleClassName="text-4xl md:text-5xl lg:text-6xl"
      descriptionClassName="text-lg md:text-xl"
      background={{
        orbs: [
          {
            color: "#6366f1",
            position: { top: "-8rem", right: "-8rem" },
            size: "18rem",
            opacity: 0.2,
          },
          {
            color: "#8b5cf6",
            position: { bottom: "-4rem", left: "-4rem" },
            size: "14rem",
            opacity: 0.15,
          },
          {
            color: "#a855f7",
            position: { top: "50%", left: "50%" },
            size: "10rem",
            opacity: 0.1,
          },
        ],
      }}
      particles={{
        count: 6,
        type: "floating",
        colors: ["#6366f1", "#8b5cf6", "#a855f7"],
        size: 6,
      }}
    >
      <div className="w-full">
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4 transition-colors duration-200 group"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
            {backLink.label}
          </Link>
        )}
        {children}
      </div>
    </HeroSection>
  );
}
