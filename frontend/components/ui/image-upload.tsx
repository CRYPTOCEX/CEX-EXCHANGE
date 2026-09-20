"use client";

import type React from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import Image from "next/image";
import { AlertCircle, ImageIcon, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  describeImageSrc,
  normalizeImageSrc,
} from "@/components/ui/image-with-fallback";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * The image picker.
 *
 * REWRITTEN 2026-07-30, against the written design system rather than against
 * the gate. The distinction matters here: the previous version scored **zero on
 * all ten** of `scan-design-debt.js`'s dimensions while carrying `rounded-xl`,
 * `shadow-lg`/`xl`/`2xl`, `shadow-primary/10` (a coloured glow), two
 * `bg-gradient-to-*` washes of one token at two alphas, `animate-ping`,
 * `animate-pulse`, `scale-[1.02]`, `hover:scale-105`, `transition-all` and
 * `border-2`. Every one of those is invisible to the scanner for a specific
 * reason — the card-shell rule only fires on a literal containing a *bare*
 * `bg-card`, and this component never painted one — so a green gate said
 * nothing at all about it. R3 ("elevation is a surface ramp, not a gradient;
 * no gradient, no glow, no tinted border to fake depth") is what it is written
 * to now.
 *
 * The behavioural half was worse. Seven defects, all user-visible:
 *
 *  1. **The "Choose file" button was dead.** It sits inside the dropzone root,
 *     whose `onClick` from `getRootProps()` is the only thing that opens the
 *     file dialog, and it called `e.stopPropagation()` — cancelling exactly
 *     that. Clicking the one control that looks like the way in did nothing;
 *     the component only worked if you clicked the space *around* the button.
 *  2. **`onChange` fired 1200ms late**, from inside a `setTimeout` behind a
 *     progress bar counting to 90% on a `setInterval`. No I/O happens here —
 *     the parent uploads on submit — so the bar was theatre and the delay was
 *     real: drop an image, hit Save immediately, and the form submitted the
 *     OLD value. On the four call sites that pass `loading`, the progress UI
 *     was also suppressed, so those got 1.2s of an inert control instead.
 *  3. **Those timers were never cleared.** Unmount inside the window and the
 *     timeout still fired `onChange` through a stale closure. In the page
 *     builder that writes to *the currently selected element* — pick an image,
 *     click a different element within 1.2s, and the image lands on the wrong
 *     one.
 *  4. **Rejected files vanished in silence.** `if (rejected.length) return;`
 *     with no message: a 1.5MB PNG against the P2P icon's `maxSize={1}` was
 *     indistinguishable from a mis-click.
 *  5. **`aspectRatio` had never once rendered.** `size` always emitted a height
 *     class too, and an explicit height beats `aspect-ratio` on a block-level
 *     element, so both call sites passing it got the default box.
 *  6. **`size="xs"` and `size="md"` had no case** and fell through to the
 *     default 256–320px — so the "extra small" picker in a 320px sidebar was
 *     taller than it was wide, and `size="sm"` was 128px tall around ~256px of
 *     content that `overflow-hidden` then clipped at both ends.
 *  7. **Every control was hover-only.** `opacity-0 group-hover:opacity-100`
 *     removes neither focusability nor hit-testing, so a keyboard user tabbed
 *     into three invisible buttons whose focus ring was composited to zero, and
 *     on touch — where there is no hover — removing an image was impossible.
 *
 * The prop surface is otherwise unchanged, deliberately: 19 call sites depend
 * on it, two of them inside the shared DataTable form fields, which put this
 * component in every admin table form. `size` also has to tolerate values
 * outside its own union — `compound-field.tsx` forwards `config.image.size`
 * straight from a model config, and the gateway columns set it to `"gateway"`.
 */
export type ImageUploadSize = "xs" | "sm" | "md" | "default" | "lg" | "xl";

interface ImageUploadProps {
  /**
   * Called whenever the user selects a file (or removes it).
   * Pass `null` to remove the image.
   */
  onChange: (fileOrNull: File | null) => void;
  /**
   * The current value in your form:
   * - Either a File (newly picked)
   * - A string (existing URL from server)
   * - Or null (no image yet)
   */
  value: File | string | null;
  /** Whether there's a validation error */
  error?: boolean;
  /** The error message to display, if any */
  errorMessage?: string;
  /** Optional title to display above the upload area */
  title?: string;
  /**
   * Set while the PARENT is doing work with the file (uploading it, say).
   * There is no internal busy state any more — handing the file up is
   * synchronous, so the only thing that can be slow is the caller.
   */
  loading?: boolean;
  /** Optional removal callback */
  onRemove?: () => void;
  /**
   * Height preset.
   *
   * The type is deliberately widened past its own union: `compound-field.tsx`
   * forwards `config.image.size` straight out of a model config, which is
   * untyped, and at least one of those (`gateway/columns.tsx`) has historically
   * sent a value that is not a size at all. Unknown values fall back to
   * `default` rather than emitting NO height class — with `aspectRatio` unset
   * that would collapse the box to zero and, since the root clips, make an
   * existing image completely invisible.
   */
  size?: ImageUploadSize | (string & {});
  /**
   * Fixes the box to a ratio INSTEAD of a height. The two are mutually
   * exclusive on purpose: emitting both is what made this prop inert.
   */
  aspectRatio?: "square" | "video" | "wide" | "tall" | "auto";
  /** Show the dimensions/size badge over the preview. */
  showMetadata?: boolean;
  /** Maximum file size in MB */
  maxSize?: number;
  /** Allowed image formats, as MIME types. Drives the hint line too. */
  acceptedFormats?: string[];
  /**
   * Associates an outer `<Label htmlFor>` with the file input. Several call
   * sites already render such a label pointing at an id that never existed on
   * anything, so the label was announced by nothing and clicked to no effect.
   */
  id?: string;
}

/**
 * Heights per `size`.
 *
 * `xs` and `sm` are the two that moved. Both had NO case in the old switch and
 * fell through to `h-64 sm:h-80`, which is why `size="xs"` rendered a 320px box
 * in a 320px-wide panel and why the two `animated-image-grid` pickers spilled
 * out of the `h-24` wrapper their call site puts them in. They are now sized to
 * the slots they are actually asked for.
 */
const SIZE_HEIGHT: Record<ImageUploadSize, string> = {
  xs: "h-20",
  sm: "h-24",
  md: "h-64 sm:h-80",
  default: "h-64 sm:h-80",
  lg: "h-80 sm:h-96",
  xl: "h-96 sm:h-112",
};

const ASPECT_CLASS = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[3/1]",
  tall: "aspect-[1/2]",
  auto: "",
} as const;

/** Below this the box only has room for the tile and one line of text. */
const COMPACT = new Set(["xs", "sm"]);

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

/**
 * "JPG, PNG, WebP" from the MIME list actually in force.
 *
 * The old hint was the fixed string `t("jpg_png_gif_webp")` regardless of what
 * `acceptedFormats` said — so a caller narrowing the list still advertised all
 * four, and even the default list's `image/svg+xml` went unmentioned.
 */
function describeFormats(formats: string[]): string {
  const seen = new Set<string>();
  for (const f of formats) {
    const sub = f.split("/")[1];
    if (!sub) continue;
    const label = sub === "jpeg" ? "JPG" : sub === "svg+xml" ? "SVG" : sub.toUpperCase();
    seen.add(label);
  }
  return Array.from(seen).join(", ");
}

export function ImageUpload({
  onChange,
  value,
  error,
  errorMessage,
  title,
  loading,
  onRemove,
  size = "default",
  aspectRatio = "auto",
  showMetadata = true,
  maxSize = 5,
  /**
   * Matches the `/api/upload` allowlist exactly
   * (`backend/src/api/upload/index.post.ts`).
   *
   * `image/svg+xml` used to be in here and is deliberately gone. The server
   * has never accepted SVG and never will — it is served from the public
   * uploads directory, where an inline-rendered SVG is stored XSS, and the
   * endpoint says so. But this list drives both the OS file dialog's filter
   * and the hint line under the dropzone, so the picker invited a format that
   * every save then rejected: the file was selected, previewed, and lost.
   * A picker must not offer what the endpoint behind it refuses.
   */
  acceptedFormats = ["image/jpeg", "image/png", "image/gif", "image/webp"],
  id,
}: ImageUploadProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");

  const reactId = useId();
  const inputId = id ?? `${reactId}-image`;
  const labelId = `${reactId}-label`;
  const errorId = `${reactId}-error`;

  /**
   * The blob URL for a picked File, and nothing else — a saved URL never goes
   * through here (see the derivation below).
   */
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  /** Decoded dimensions, keyed by the src they were measured from. */
  const [dims, setDims] = useState<{
    src: string;
    width: number;
    height: number;
  } | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  /**
   * The src that failed to decode, not a boolean.
   *
   * A boolean would have to be reset every time `value` changes, which means a
   * `setState` in the effect body — a cascading render, and what
   * `react-hooks/set-state-in-effect` correctly rejects. Keying the failure to
   * the src makes "has this particular image failed?" a comparison instead of
   * a second piece of state to keep in sync.
   */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const isCompact = COMPACT.has(size);
  const isBusy = Boolean(loading);

  /**
   * A saved URL, and a File's name and byte size, are pure derivations of
   * `value` — so they are computed during render, not synchronised in an
   * effect. That is also what removes the empty-state flash: the old build
   * initialised `previewUrl` to `null` and filled it from an effect, so every
   * edit form painted "Upload an image" first and swapped the saved image in
   * only after hydration.
   */
  const urlValue = typeof value === "string" && value.trim() !== "" ? value : null;
  const fileMeta = useMemo(
    () => (value instanceof File ? { size: value.size, name: value.name } : null),
    [value]
  );
  const previewUrl = value instanceof File ? objectUrl : urlValue;

  /**
   * Is that string something `next/image` will actually accept?
   *
   * IT THROWS DURING RENDER IF NOT — `Failed to parse src "credit-card"`, or
   * the `remotePatterns` hostname variant — and a render throw is not an
   * `onError`, so `failedSrc` below never gets a chance and the exception
   * escapes to the route's error boundary. The whole page becomes "Something
   * went wrong" because one row held a value that isn't a URL.
   *
   * That is not hypothetical for this component: `value` is whatever the form
   * loaded from the database, and columns that *look* like image columns are
   * not always URLs. `p2pPaymentMethod.icon` stores a lucide slug
   * ("credit-card", "bank-transfer") for its seeded rows — the P2P storefront
   * renders those through `PaymentMethodIcon` — and opening such a row in the
   * admin editor at /admin/p2p/payment-method/[id] took the route down.
   *
   * `describeImageSrc` is the shared guard (see `image-with-fallback.tsx`);
   * a src it rejects is treated exactly like a missing one, so the picker
   * falls back to its own empty state rather than to a placeholder graphic.
   */
  const described = useMemo(() => {
    const normalized = normalizeImageSrc(previewUrl);
    return normalized ? describeImageSrc(normalized) : null;
  }, [previewUrl]);

  /**
   * The object URL is the one thing here that genuinely needs an effect: it is
   * an external resource that must be created for a File and released again,
   * which is the carve-out the rule's own docs describe. Keeping the derived
   * cases above out of it shrinks that to a single line.
   */
  useEffect(() => {
    if (!(value instanceof File)) return;

    const url = URL.createObjectURL(value);
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObjectUrl(url);

    // Dimensions, if the file decodes. Both handlers are callbacks, not effect
    // body, and both are guarded: a slow decode that resolved after the value
    // moved on used to write the previous file's dimensions over the current
    // one's.
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setDims({ src: url, width: probe.width, height: probe.height });
    };
    // A file can pass the MIME check and still fail to decode. Without this the
    // old build left the preview at `opacity-0` forever — a blank bordered box
    // with nothing to explain it.
    probe.onerror = () => {
      if (!cancelled) setFailedSrc(url);
    };
    probe.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [value]);

  const describeRejection = useCallback(
    (rejections: FileRejection[]): string => {
      const code = rejections[0]?.errors?.[0]?.code;
      if (code === "file-too-large") {
        return t("file_is_larger_than_the_limit", { max: `${maxSize} MB` });
      }
      if (code === "file-invalid-type") return t("that_file_type_is_not_supported");
      if (code === "too-many-files") return t("only_one_image_can_be_uploaded");
      return rejections[0]?.errors?.[0]?.message || t("that_file_could_not_be_used");
    },
    [maxSize, t]
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        setRejection(describeRejection(rejections));
        return;
      }
      const file = accepted[0];
      if (!file) return;
      setRejection(null);
      // Synchronously. The parent owns the upload; anything asynchronous here
      // only opens a window in which the form holds a stale value.
      onChange(file);
    },
    [describeRejection, onChange]
  );

  const { getRootProps, getInputProps, open, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce(
      (acc, format) => {
        acc[format] = [];
        return acc;
      },
      {} as Record<string, string[]>
    ),
    multiple: false,
    maxSize: maxSize * 1024 * 1024,
    disabled: isBusy,
  });

  const handleRemove = useCallback(
    (event: React.MouseEvent) => {
      // Genuinely needed: this button is inside the dropzone root, whose click
      // handler opens the file dialog. Removing an image must not also prompt
      // for a replacement.
      event.stopPropagation();
      setRejection(null);
      if (onRemove) onRemove();
      else onChange(null);
    },
    [onChange, onRemove]
  );

  const handleBrowse = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      // `open()` rather than letting the click bubble to the root: this is the
      // exact line the old build got wrong, cancelling the dialog it meant to
      // trigger.
      open();
    },
    [open]
  );

  const boxShape = useMemo(() => {
    if (aspectRatio && aspectRatio !== "auto") return ASPECT_CLASS[aspectRatio];
    return SIZE_HEIGHT[size as ImageUploadSize] ?? SIZE_HEIGHT.default;
  }, [aspectRatio, size]);

  const formatHint = useMemo(() => describeFormats(acceptedFormats), [acceptedFormats]);

  const message = rejection || (error ? errorMessage : null);
  const hasError = Boolean(rejection) || Boolean(error);
  const showPreview = Boolean(described) && failedSrc !== described!.url;

  // `dims.src === previewUrl` is what stops a slow decode from labelling the
  // NEXT image with the previous one's dimensions.
  const dimensions =
    dims && dims.src === previewUrl ? `${dims.width} × ${dims.height}` : null;
  const badge = [dimensions, fileMeta?.size ? formatFileSize(fileMeta.size) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex w-full flex-col gap-2">
      {title && (
        <span id={labelId} className="text-sm font-medium text-foreground">
          {title}
        </span>
      )}

      <div
        // `role` goes THROUGH `getRootProps` rather than after the spread, so a
        // later prop reorder cannot silently undo it. `getRootProps()` defaults
        // to `role="presentation"` with `tabIndex={0}`, and a focusable element
        // whose role is ignored falls back to generic — a screen reader landed
        // on something with no role and no accessible name at all.
        {...getRootProps({ role: "button" })}
        aria-labelledby={title ? labelId : undefined}
        aria-label={title ? undefined : t("upload_an_image")}
        aria-describedby={message ? errorId : undefined}
        aria-busy={isBusy}
        aria-invalid={hasError || undefined}
        className={cn(
          "group relative w-full overflow-hidden rounded-lg",
          "transition-[color,background-color,border-color] duration-200",
          "focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
          // R3: the target reads as a target because of a hairline and a step
          // on the surface ramp — never a shadow, a glow or a gradient.
          showPreview
            ? "border border-border bg-surface-3"
            : "cursor-pointer border border-dashed border-border-strong bg-transparent hover:border-primary/50 hover:bg-surface-3/50",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/10",
          // Input's shipped error recipe: the border stays 1px and the emphasis
          // comes from a ring, so validation cannot shift the layout.
          hasError && !isDragActive && "border-destructive ring-[3px] ring-destructive/20",
          isBusy && "pointer-events-none",
          boxShape
        )}
      >
        <input {...getInputProps({ id: inputId })} />

        {showPreview && described ? (
          <>
            <Image
              src={described.url}
              alt={title || fileMeta?.name || t("upload_an_image")}
              fill
              // Required for `blob:` URLs, which Next's optimizer cannot fetch,
              // and for a remote host that is not in `remotePatterns` — the
              // optimizer's allowlist check is the other render-time throw, and
              // skipping the loader skips the check. Still optimized for the
              // ordinary case, a `/uploads/...` path: that was unconditionally
              // `unoptimized` once, so every stored image on every edit form
              // shipped at full resolution.
              unoptimized={value instanceof File || described.unoptimized}
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-cover"
              onError={() => setFailedSrc(described.url)}
            />

            {/* Reachable without a mouse: `focus-within` covers the keyboard,
                `pointer-coarse` covers touch, where there is no hover state to
                reveal them with at all. */}
            <div
              className={cn(
                "absolute top-2 right-2 z-10 flex items-center gap-1.5",
                "opacity-0 transition-opacity duration-200",
                "group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
              )}
            >
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                onClick={handleBrowse}
                aria-label={t("replace_image")}
                title={t("replace_image")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                onClick={handleRemove}
                aria-label={t("remove_image")}
                title={t("remove_image")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Only while a file is genuinely over the target. The old build
                painted a scrim on plain hover, dimming the image the user was
                trying to look at. Flat `--overlay`, not a gradient. */}
            {isDragActive && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-overlay/60">
                {/* `--surface-2` ("raised strip, popover"), not `--card`: this
                    is a pill floating over an image, not a panel sitting in the
                    page — and the shell rule is right to flag a `bg-card`
                    surface carrying a non-`lg` radius. */}
                <span className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-foreground">
                  <Upload className="h-4 w-4 text-primary" />
                  {t("drop_new_image_to_replace")}
                </span>
              </div>
            )}

            {showMetadata && !isCompact && badge && (
              <div className="absolute bottom-2 left-2 z-10 rounded-sm bg-overlay/70 px-2 py-1 text-[11px] font-medium text-overlay-foreground">
                {badge}
              </div>
            )}

            {isBusy && (
              <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-overlay/60 text-sm font-medium text-overlay-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("processing_image")}…
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
            {isBusy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                {!isCompact && (
                  <p className="text-sm text-muted-foreground">
                    {t("processing_image")}…
                  </p>
                )}
              </>
            ) : (
              <>
                {/* The card anatomy's icon tile: flat tint, no gradient, no
                    pulsing ring. Drag-over raises the alpha instead of scaling
                    the box, which would move the drop geometry under the
                    cursor mid-drag. */}
                <span
                  className={cn(
                    "grid shrink-0 place-items-center text-primary",
                    "transition-[background-color] duration-200",
                    isCompact ? "h-7 w-7 rounded-sm" : "h-12 w-12 rounded-lg",
                    isDragActive ? "bg-primary/25" : "bg-primary/15"
                  )}
                >
                  <ImageIcon className={isCompact ? "h-3.5 w-3.5" : "h-6 w-6"} />
                </span>

                <p
                  className={cn(
                    "font-medium text-foreground",
                    isCompact ? "text-[11px]" : "text-sm"
                  )}
                >
                  {isDragActive
                    ? t("drop_it_here")
                    : previewUrl
                      ? t("that_image_could_not_be_displayed")
                      : t("upload_an_image")}
                </p>

                {!isCompact && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {t("drag_and_drop_or_click_to_browse")}
                    </p>
                    <p className="text-[11px] text-subtle-foreground">
                      {formatHint} · {t("max_size_mb", { size: maxSize })}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleBrowse}
                    >
                      <Upload className="h-4 w-4" />
                      {tCommon("choose_file")}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {message && (
        <p
          id={errorId}
          role="status"
          className="flex items-start gap-1.5 text-xs text-destructive-ink"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
