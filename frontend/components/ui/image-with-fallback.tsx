"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

export const DEFAULT_IMAGE_FALLBACK = "/placeholder.svg";

/**
 * Normalise a stored image path before handing it to next/image.
 *
 * Uploads written by older builds joined the directory with `path.join` on
 * Windows and persisted the result verbatim, so rows exist with values like
 * `/uploads/ecommerceProducts\image/1717662441655-974970802.webp`. A backslash
 * is a legal URL character, so the request goes out unescaped and 404s. The
 * upload route normalises on write now; this covers the rows already stored.
 */
export function normalizeImageSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  // Only rewrite path-ish values -- a data: URI can contain a legitimate
  // backslash inside its payload.
  if (trimmed.startsWith("data:")) return trimmed;
  return trimmed.replace(/\\/g, "/");
}

/**
 * Would next/image accept this src, and does it need the optimizer bypassed?
 *
 * THIS IS NOT AN `onError` CONCERN, WHICH IS THE WHOLE REASON IT EXISTS.
 * `next/image` validates the host inside `getImgProps` and **throws during
 * render** when it is not in `next.config.js` `remotePatterns`:
 *
 *     Invalid src prop (https://…) on `next/image`, hostname "…" is not
 *     configured under images in your `next.config.js`
 *
 * There is no load to fail, so `onError` never runs and the fallback below
 * never gets its chance — the throw escapes to the nearest error boundary and
 * the whole route renders as *500 Something went wrong*. A single product row
 * carrying a supplier-hosted image is enough to do it, and any page listing
 * user- or admin-supplied image URLs can hit it. Observed in the browser on
 * /ecommerce/shipping, not deduced.
 *
 * `unoptimized` skips the loader and with it the allowlist check, so a remote
 * host renders (unoptimised) instead of taking the page down, and a genuinely
 * dead URL falls through to `onError` like any other.
 *
 * Exported because the fallback-to-placeholder behaviour below is not always
 * what a caller wants — `ImageUpload` has its own empty state and must NOT
 * paint a placeholder over the picker — but the "would next/image throw on
 * this?" question is identical everywhere and must have exactly one answer.
 */
export function describeImageSrc(
  value: string
): { url: string; unoptimized: boolean } | null {
  // next/image already treats these as unoptimized, but saying so explicitly
  // keeps the branch below total.
  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return { url: value, unoptimized: true };
  }
  // Protocol-relative resolves against the page scheme; normalise so the parse
  // below sees something absolute.
  const candidate = value.startsWith("//") ? `https:${value}` : value;
  if (candidate.startsWith("/")) return { url: candidate, unoptimized: false };

  try {
    const { protocol } = new URL(candidate);
    if (protocol !== "http:" && protocol !== "https:") return null;
    return { url: candidate, unoptimized: true };
  } catch {
    // Not a URL and not rooted — e.g. a bare `example.com/a.png` or a stray
    // filename. next/image rejects these outright, so treat them as missing.
    return null;
  }
}

export interface ImageWithFallbackProps extends Omit<ImageProps, "src"> {
  src?: string | null;
  /** Shown when `src` is empty or fails to load. */
  fallbackSrc?: string;
  /**
   * Rendered INSTEAD of `fallbackSrc` when there is no usable image.
   *
   * Two reasons to reach for this on small tiles. `/placeholder.svg` is drawn
   * on a 1200x1200 canvas with its graphic confined to the middle third, so at
   * a 64px thumbnail the whole illustration collapses to an illegible speck —
   * the tile reads as an empty box, not as "no image". And being loaded through
   * `<img src>` makes it a separate document, so it can only read the OS
   * `prefers-color-scheme` and never the app's class-based `.dark` toggle; when
   * the two disagree it paints the wrong arm. Its own header comment says so.
   *
   * A node is in the page, so it takes tokens and follows the app theme.
   */
  fallback?: React.ReactNode;
}

/**
 * next/image that degrades to a placeholder instead of a broken image.
 *
 * The `src={value || "/placeholder.svg"}` idiom used across the app only
 * catches an empty value. A value that is present but whose file is gone --
 * the common case here, since image rows outlive the files they point at --
 * sails past it and renders as a broken image. This catches the load failure
 * too, which is the only place a 404 becomes observable on the client.
 */
export function ImageWithFallback({
  src,
  fallbackSrc = DEFAULT_IMAGE_FALLBACK,
  fallback,
  alt,
  onError,
  unoptimized,
  ...props
}: ImageWithFallbackProps) {
  const normalized = normalizeImageSrc(src);
  const described = normalized ? describeImageSrc(normalized) : null;
  const [failed, setFailed] = useState(false);

  // Lists recycle a single element across pages, filters and route changes, so
  // the same instance is handed a different `src`. Without this reset one
  // broken image would pin every later item in that slot to the fallback.
  useEffect(() => {
    setFailed(false);
  }, [normalized]);

  const usingFallback = !described || failed;
  const resolved = usingFallback ? fallbackSrc : described.url;

  if (usingFallback && fallback !== undefined) return <>{fallback}</>;

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      // A caller's explicit value still wins; otherwise bypass the optimizer
      // for exactly the srcs whose host it would reject at render time.
      unoptimized={unoptimized ?? (!usingFallback && described.unoptimized)}
      onError={(event) => {
        // Guard against a missing fallback asset looping the error handler.
        if (resolved !== fallbackSrc) setFailed(true);
        onError?.(event);
      }}
    />
  );
}

export default ImageWithFallback;
