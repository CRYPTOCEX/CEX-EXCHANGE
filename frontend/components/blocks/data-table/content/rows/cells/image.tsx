"use client";

import React, { useEffect, useState } from "react";
import { Lightbox } from "@/components/ui/lightbox";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { ImageIcon } from "lucide-react";

export interface ImageCellProps {
  value: string;
  row?: any;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string | ((row: any) => string);
  alt?: string;
}

/**
 * The rendered box for each `size`, exported so the pending state can reserve
 * the SAME box rather than a hand-picked one.
 *
 * `../skeleton/cell.tsx` reserved `w-11 h-11` (44px) for every image column.
 * The default size here is `md` — 64px — so an image column's skeleton was
 * 20px short in BOTH axes, and since the avatar is usually the tallest thing
 * in the row it set the row height: ten rows each grew 20px as the data
 * landed, i.e. 200px of the table moved. An `xl` column (128px) was out by 84.
 */
export const IMAGE_CELL_SIZES: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-20 h-20",
  xl: "w-32 h-32",
};

export function ImageCell({
  value,
  row,
  size = "md",
  fallback,
  alt = "Preview",
}: ImageCellProps) {
  const t = useTranslations("components_blocks");
  const [imgError, setImgError] = useState(false);

  // Table rows are recycled across pages and filters, so the same ImageCell
  // instance is handed a different `value`. Without this reset one broken
  // avatar would pin every later row in this slot to the fallback.
  useEffect(() => {
    setImgError(false);
  }, [value]);

  const sizeClass = IMAGE_CELL_SIZES[size];

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
          : fallbackContent || t("no_image")}
      </div>
    );
  }

  /*
    A NAME IS NOT A URL, AND ASKING FOR IT COSTS A 404.

    Several tables store an ICON NAME in the column this renders —
    `building-bank`, `credit-card`, `banknote` — chosen by an operator in a
    picker. Handed to an <img>, the browser resolves it RELATIVE to the current
    route, so /admin/p2p/payment-method requested /en/admin/p2p/building-bank
    and took a 404 against the app's own origin. `onError` then swapped in the
    fallback, so the screen looked merely plain: the only visible symptom was
    in the network panel, and nothing external ever reported it.

    The same shape test the fallback below already uses decides it. A name is
    drawn as an icon and never requested; a path or URL is loaded as before.
  */
  const looksLikeAsset = value.includes("/") || value.includes(".");
  if (!looksLikeAsset) {
    return (
      <div
        className={cn(
          sizeClass,
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground"
        )}
      >
        <Icon icon={value} fallback={ImageIcon} className="h-1/2 w-1/2" />
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
