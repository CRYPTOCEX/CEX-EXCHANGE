"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { cn } from "@/lib/utils";
import { getInitials } from "../blocks/data-table/utils/image";

interface LightboxProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  alt: string;
}

/**
 * WHY THIS OWNS THE ERROR STATE
 *
 * A missing `src` already fell back to initials, but a `src` that FAILED TO
 * LOAD did not: the `<img>` stayed mounted and the browser painted its own
 * broken-image glyph next to the alt text. That is the "torn page + Core"
 * artefact seen in the admin user table.
 *
 * It could not be fixed at the call sites: of the ~296 places that render a
 * Lightbox, zero passed an `onError`. Callers that DO pass one still get it —
 * theirs runs after ours — but the initials degradation no longer depends on
 * anyone remembering.
 *
 * Note this covers the SECOND failure too. `ImageCell` reacts to a broken
 * avatar by rendering the *fallback* URL through this same component, so when
 * the fallback asset is itself missing (as `/img/placeholder.svg` was while it
 * held malformed XML) the glyph would otherwise come straight back.
 */
export function Lightbox({
  src,
  alt,
  className,
  wrapperClassName,
  onError,
  ...props
}: LightboxProps) {
  const [failed, setFailed] = useState(false);

  // A row re-used for a different record swaps `src` in place; without this the
  // component would stay stuck on the previous image's failure.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = getInitials(alt);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground font-medium",
          className,
          wrapperClassName
        )}
        // `title` keeps the subject discoverable now that no alt text is painted.
        title={alt}
        {...props}
      >
        {initials}
      </div>
    );
  }

  return (
    <Zoom>
      <div className={cn("cursor-zoom-in", wrapperClassName)}>
        <img
          src={src}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
          onError={(event) => {
            setFailed(true);
            onError?.(event);
          }}
          {...props}
        />
      </div>
    </Zoom>
  );
}
