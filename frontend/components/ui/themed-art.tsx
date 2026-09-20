"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Theme-aware product art.
 *
 * Every illustration under `/img/store/` is authored dark — near-black
 * background, white ink — and each has a light sibling at
 * `<name>-light.svg` (see `scripts/generate-store-art-light.mjs`). On a light
 * page the dark file is a black rectangle dropped into the middle of the
 * layout: legible, and obviously wrong.
 *
 * ---------------------------------------------------------------------------
 * WHY BOTH ARE RENDERED AND SWAPPED IN CSS
 * ---------------------------------------------------------------------------
 * The obvious alternative — a `prefers-color-scheme` media query inside the SVG
 * — does NOT work here. An SVG loaded through `<img>` is its own document, and
 * that query resolves against the OPERATING SYSTEM, not against this app. The
 * theme is a `.dark` class on `<html>` set by next-themes, so a user on a light
 * OS who switches the admin to dark would keep getting the light art, and the
 * mismatch would be unfixable from inside the file.
 *
 * Rendering both and letting `dark:` decide tracks the real theme, needs no
 * JavaScript on the happy path, and avoids the hydration flash a `useTheme()`
 * branch would produce.
 *
 * If a light sibling is ever missing the light `<img>` errors and we fall back
 * to the dark file in both themes — never a broken image.
 *
 * Mirrors `store/components/media/themed-art.tsx`; the two art sets come from
 * the same pipeline and share a palette.
 */
export function ThemedArt({
  src,
  alt,
  className,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [lightOk, setLightOk] = useState(true);

  // Only the generated store art has siblings. A DB `image` column pointing at
  // /img/extensions/*.png must render untouched.
  const themed = /^\/img\/store\/[^/]+\.svg$/.test(src);

  if (!themed || !lightOk) {
    return <img src={src} alt={alt} loading={loading} className={className} />;
  }

  const light = src.replace(/\.svg$/, "-light.svg");
  return (
    <>
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={cn(className, "hidden dark:block")}
      />
      <img
        src={light}
        alt={alt}
        loading={loading}
        onError={() => setLightOk(false)}
        className={cn(className, "block dark:hidden")}
      />
    </>
  );
}
