"use client";

import React, { useState } from "react";
import { Lightbox } from "@/components/ui/lightbox";
import { cn } from "@/lib/utils";

export interface ImageCellProps {
  value: string;
  row?: any;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string | ((row: any) => string);
  alt?: string;
}

export function ImageCell({
  value,
  row,
  size = "md",
  fallback,
  alt = "Preview",
}: ImageCellProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses: Record<"sm" | "md" | "lg" | "xl", string> = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
    xl: "w-32 h-32",
  };

  const sizeClass = sizeClasses[size];

  if (!value || imgError) {
    const fallbackContent =
      typeof fallback === "function" && row ? fallback(row) : fallback;
    const isUrl =
      typeof fallbackContent === "string" &&
      (fallbackContent.includes("/") || fallbackContent.includes("."));
    if (isUrl) {
      return (
        <Lightbox
          src={fallbackContent}
          alt={alt}
          className={`${sizeClass} object-cover rounded-full`}
          wrapperClassName="inline-block"
        />
      );
    }
    return (
      <div
        className={cn(
          sizeClass,
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground"
        )}
      >
        {typeof fallbackContent === "function"
          ? fallbackContent(row)
          : fallbackContent || "No Image"}
      </div>
    );
  }

  return (
    <Lightbox
      src={value}
      alt={alt}
      className={`${sizeClass} object-cover rounded-full`}
      wrapperClassName="inline-block"
      onError={() => setImgError(true)}
    />
  );
}
