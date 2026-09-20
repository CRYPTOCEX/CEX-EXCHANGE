"use client";

/**
 * A plan's image, and what to do when there isn't one.
 *
 * WHY THE MISSING CASE IS A PROP AND NOT ONE BEHAVIOUR
 * ----------------------------------------------------
 * `plan.image` is optional, and even when it is set the file behind it may be
 * gone — an image row outlives the upload it points at, and most rows in a
 * seeded catalogue point at nothing. So "no usable image" is the common case,
 * not the edge one, and the right answer differs by surface:
 *
 *   GRID  Keep a tile. Twelve cards in three columns want one footprint, and a
 *         56px tile that quietly says "no image" costs nothing and keeps the
 *         titles on one line with each other.
 *
 *   PAGE  Collapse. A single plan page has nothing to align with, so a 320x160
 *         bordered rectangle containing one grey glyph is just a large empty
 *         box above the facts — it reads as a broken image rather than as an
 *         absent one, which is what it looked like.
 *
 * FAILURE IS TRACKED AGAINST THE SRC, NOT AS A BARE BOOLEAN.
 * A bare `failed` flag has to be reset when `src` changes, and the obvious
 * place to reset it is an effect — which is a setState in an effect body, the
 * cascading-render pattern the lint rule in this repo rejects. Comparing the
 * recorded failure to the CURRENT src needs no reset: a new src simply is not
 * the one that failed.
 */

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ImageWithFallback,
  normalizeImageSrc,
} from "@/components/ui/image-with-fallback";

interface PlanImageProps {
  src?: string | null;
  /** What to render when there is no usable image. */
  whenMissing: "tile" | "hide";
  /** The box. Must establish a containing block — `fill` positions against it. */
  className: string;
  /** `next/image` sizes hint. */
  sizes: string;
  /** Inset so a contained image does not touch the border. */
  padding?: string;
  glyphClassName?: string;
}

export function PlanImage({
  src,
  whenMissing,
  className,
  sizes,
  padding = "p-1",
  glyphClassName = "size-4",
}: PlanImageProps) {
  const usable = normalizeImageSrc(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const missing = !usable || failedSrc === usable;

  if (missing && whenMissing === "hide") return null;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border border-border bg-surface-3",
        className
      )}
    >
      {missing ? (
        /*
          A NODE, NOT `/placeholder.svg`. The default fallback is a 1200x1200
          canvas with its graphic confined to the middle third, so at tile size
          it collapses to an illegible speck; and being loaded through
          `<img src>` makes it a separate document that can only read the OS
          colour scheme, never the app's class-based dark toggle, so it paints
          the wrong arm whenever the two disagree. Its own prop doc says both.
        */
        <span className="absolute inset-0 grid place-items-center text-subtle-foreground">
          <ImageOff className={glyphClassName} aria-hidden="true" />
        </span>
      ) : (
        <ImageWithFallback
          src={usable}
          alt=""
          fill
          /*
            CONTAIN, NEVER COVER. `plan.image` has no declared aspect ratio: the
            upload path bounds it to 1024x728 with sharp's `fit: "inside"`, which
            is a MAXIMUM and not a shape, so real files run from 144x144 avatars
            to 1017x728 screenshots. Cropping to a fixed frame would cut half the
            height off every square.
          */
          className={cn("object-contain", padding)}
          sizes={sizes}
          onError={() => setFailedSrc(usable)}
        />
      )}
    </div>
  );
}
