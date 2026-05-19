"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useLogoCacheStore } from "@/store/logo-cache";

interface LogoProps {
  type?: "icon" | "text";
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({
  type = "icon",
  className,
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const { logoVersion } = useLogoCacheStore();
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Preload both light and dark theme images in the background
  useEffect(() => {
    if (!mounted) return;

    const preloadImage = (url: string) => {
      const img = new window.Image();
      img.src = url;
    };

    const cacheBuster = `?v=${logoVersion}`;

    if (type === "icon") {
      preloadImage(`/img/logo/logo.webp${cacheBuster}`);
      preloadImage(`/img/logo/logo-dark.webp${cacheBuster}`);
    } else {
      preloadImage(`/img/logo/logo-text.webp${cacheBuster}`);
      preloadImage(`/img/logo/logo-text-dark.webp${cacheBuster}`);
    }
  }, [mounted, logoVersion, type]);

  const getLogoUrl = () => {
    const cacheBuster = mounted ? `?v=${logoVersion}` : '';

    if (!mounted) {
      return type === "icon" ? "/img/logo/logo.webp" : "/img/logo/logo-text.webp";
    }

    const isDark = resolvedTheme === "dark";

    if (type === "icon") {
      const baseUrl = isDark ? "/img/logo/logo-dark.webp" : "/img/logo/logo.webp";
      return `${baseUrl}${cacheBuster}`;
    } else {
      const baseUrl = isDark ? "/img/logo/logo-text-dark.webp" : "/img/logo/logo-text.webp";
      return `${baseUrl}${cacheBuster}`;
    }
  };

  const url = getLogoUrl();

  if (imageError) {
    return (
      <div className={cn("flex items-center justify-center bg-primary text-primary-foreground rounded", className)}>
        <span className={cn("font-bold", type === "icon" ? "text-xs" : "text-sm")}>
          LOGO
        </span>
      </div>
    );
  }

  const containerClass = type === "icon"
    ? "relative h-9 w-9 lg:h-10 lg:w-10 flex-shrink-0"
    : "relative h-9 lg:h-12 w-[180px] lg:w-[220px] flex-shrink-0";

  return (
    <div className={cn(containerClass, className)}>
      <img
        src={url}
        alt="Logo"
        className="object-contain w-full h-full"
        decoding="async"
        onError={() => setImageError(true)}
      />
    </div>
  );
}
