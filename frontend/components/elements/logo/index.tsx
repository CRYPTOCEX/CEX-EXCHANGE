"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useLogoCacheStore } from "@/store/logo-cache";
import Image from "next/image";

interface LogoProps {
  type?: "icon" | "text";
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({
  type = "icon",
  className,
  width,
  height,
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const { logoVersion } = useLogoCacheStore();
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Prevent hydration mismatch by only rendering theme-specific content after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset error state when logoVersion changes
  useEffect(() => {
    setImageError(false);
  }, [logoVersion]);

  // Determine logo URL based on theme and type - use files directly
  const getLogoUrl = () => {
    // Add cache busting only after mounting to prevent hydration issues
    const cacheBuster = mounted ? `?v=${logoVersion}` : '';
    
    // During SSR and before hydration, always use light theme to prevent mismatch
    if (!mounted) {
      return type === "icon" ? "/img/logo/logo.webp" : "/img/logo/logo-text.webp";
    }
    
    const isDark = resolvedTheme === "dark";
    
    if (type === "icon") {
      // Use direct file paths based on theme - logo.webp for light, logo-dark.webp for dark
      const baseUrl = isDark ? "/img/logo/logo-dark.webp" : "/img/logo/logo.webp";
      return `${baseUrl}${cacheBuster}`;
    } else {
      // Full logo with text - logo-text.webp for light, logo-text-dark.webp for dark
      const baseUrl = isDark ? "/img/logo/logo-text-dark.webp" : "/img/logo/logo-text.webp";
      return `${baseUrl}${cacheBuster}`;
    }
  };

  const url = getLogoUrl();

  // Fallback to a placeholder or default logo if main logo fails
  const handleError = () => {
    setImageError(true);
  };

  if (imageError) {
    // Fallback to a simple text logo or placeholder
    return (
      <div className={cn("flex items-center justify-center bg-primary text-primary-foreground rounded", className)}>
        <span className={cn("font-bold", type === "icon" ? "text-xs" : "text-sm")}>
          LOGO
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        key={`logo-${type}-${logoVersion}`} // Force re-render when version changes
        src={url}
        alt="Logo"
        width={width || (type === "icon" ? 32 : 180)}
        height={height || (type === "icon" ? 32 : 48)}
        className={cn(
          "object-contain",
          type === "icon" ? "h-full w-full" : "h-full w-auto",
          className
        )}
        unoptimized // Allow cache busting to work properly
        onError={handleError}
        priority={type === "icon"} // Prioritize icon logos
      />
    </div>
  );
}
