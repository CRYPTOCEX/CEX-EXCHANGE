"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * A collection's logo, degrading to its initials.
 * =========================================================================
 *
 * `logoImage` is a user upload or an IPFS URL, so it goes missing for ordinary
 * reasons — the gateway is slow, the pin lapsed, the file was cleared between
 * environments. Every call site rendered it as a bare `next/image` with no
 * error path, so a miss painted the browser's broken-image glyph next to the
 * collection name; the collection picker on /nft/create showed one where the
 * logo belongs. The sites that used `<Avatar>` were already covered by
 * `<AvatarFallback>` — this gives the plain-image sites the same floor.
 *
 * The fallback is the collection's own initials rather than a shared
 * placeholder so that a list of logo-less collections stays distinguishable.
 */
export interface CollectionAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function CollectionAvatar({
  src,
  name,
  size = 32,
  className,
}: CollectionAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground",
          className
        )}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(9, Math.round(size * 0.36)),
        }}
        aria-label={name || undefined}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <Image
      key={src}
      src={src}
      alt={name || ""}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
