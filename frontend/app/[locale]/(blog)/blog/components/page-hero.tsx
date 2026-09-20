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
            }
          : undefined
      }
      title={titleConfig}
      description={description}
      layout="centered"
      maxWidth="max-w-3xl"
      titleClassName="text-4xl md:text-5xl lg:text-6xl"
      descriptionClassName="text-lg md:text-xl"
    >
      <div className="w-full">
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center text-sm text-primary hover:text-primary mb-4 transition-colors duration-200 group"
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
