"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { normalizeImageSrc } from "@/components/ui/image-with-fallback";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * The multi-image picker.
 *
 * WHY IT IS NOT `ImageUpload` IN A LOOP
 * -------------------------------------
 * `ImageUpload` owns one slot: its value is `File | string | null`, its
 * dropzone is `multiple: false`, and removal means writing `null`. A gallery
 * needs the three things that shape rules out — dropping five files in one
 * gesture, an ORDER the merchant controls, and an "add" affordance that is not
 * itself one of the slots. Wrapping it would have meant N dropzones, each of
 * which can only ever accept one file, and a remove that has to be translated
 * from "this slot is now empty" into "this slot is gone".
 *
 * WHAT THE VALUE IS
 * -----------------
 * `(File | string)[]`, and both shapes coexist for the life of the form: a
 * stored gallery arrives as paths, anything picked in this session is a `File`
 * until `processImageUploads` walks the array on submit and swaps each one for
 * the URL the server wrote. Index order IS the display order, so every mutation
 * here rebuilds the array rather than editing in place.
 *
 * THE CONTROLS ARE NOT HOVER-ONLY, DELIBERATELY.
 * `opacity-0 group-hover:opacity-100` removes neither focusability nor hit
 * testing, so a keyboard user tabs through invisible buttons and a touch user —
 * who has no hover — cannot remove an image at all. That was defect 7 in the
 * `ImageUpload` rewrite and it is not being reintroduced here.
 */

/** Matches the server allowlist. SVG is absent on purpose: served from public
 *  uploads it is stored XSS, and the route has never accepted it — offering it
 *  in the file dialog only invites a format every save rejects. */
const ACCEPTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Per-file ceiling, in MB.
 *
 * `imageUploader` base64-encodes the file into a JSON body, so the REQUEST is
 * 4/3 of the file. Against `/api/upload`'s 5MB body limit the real ceiling is
 * ~3.75MB of source image, so advertising 5 would advertise a size that cannot
 * be saved.
 */
const MAX_SIZE_MB = 3.5;

interface GalleryFormControlProps {
  field: {
    value: unknown;
    onChange: (value: (File | string)[]) => void;
    onBlur?: () => void;
  };
  error?: string;
  /** Hard cap on slots. Mirrors the model's own cap so the UI cannot ask for
   *  images the server would silently drop. */
  maxImages?: number;
  /** The box uploads are downscaled into, printed so the operator knows what
   *  the stored image will be. */
  maxWidth?: number;
  maxHeight?: number;
  title?: string;
  description?: string;
}

/** A slot's preview URL plus a stable key, so React does not remount every
 *  tile when one is removed from the middle. */
interface Slot {
  key: string;
  url: string | null;
  isFile: boolean;
  name: string;
}

export function GalleryFormControl({
  field,
  error,
  maxImages = 12,
  maxWidth = 1600,
  maxHeight = 1600,
  title,
  description,
}: GalleryFormControlProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const [rejection, setRejection] = useState<string | null>(null);

  /**
   * Only an array is a gallery.
   *
   * The field can legitimately hold `undefined` before the form resets with row
   * data, and a JSON column read from a MariaDB install arrives as a string —
   * neither has a `.length`, and rendering must not depend on which one showed
   * up.
   */
  const items = useMemo<(File | string)[]>(
    () => (Array.isArray(field.value) ? field.value : []),
    [field.value]
  );

  /**
   * Object URLs for the File slots, revoked when they stop being used.
   *
   * Keyed by the File instance itself: the array is rebuilt on every reorder,
   * so an index-keyed map would revoke and re-create a URL for an image that
   * only moved one place left.
   */
  const [objectUrls, setObjectUrls] = useState<Map<File, string>>(new Map());

  useEffect(() => {
    const files = items.filter((entry): entry is File => entry instanceof File);

    setObjectUrls((previous) => {
      const next = new Map<File, string>();
      let changed = false;

      for (const file of files) {
        const existing = previous.get(file);
        if (existing) {
          next.set(file, existing);
        } else {
          next.set(file, URL.createObjectURL(file));
          changed = true;
        }
      }

      for (const [file, url] of previous) {
        if (!next.has(file)) {
          URL.revokeObjectURL(url);
          changed = true;
        }
      }

      // Returning `previous` unchanged keeps this effect from looping: setting
      // state to a new-but-equal Map would re-run the render that scheduled it.
      return changed ? next : previous;
    });
  }, [items]);

  // Unmount is the one case the diff above cannot see — `items` never becomes
  // empty, the component simply stops existing.
  useEffect(() => {
    return () => {
      setObjectUrls((previous) => {
        for (const url of previous.values()) URL.revokeObjectURL(url);
        return new Map();
      });
    };
  }, []);

  const slots = useMemo<Slot[]>(
    () =>
      items.map((entry, index) => {
        if (entry instanceof File) {
          return {
            key: `file-${entry.name}-${entry.size}-${entry.lastModified}-${index}`,
            url: objectUrls.get(entry) ?? null,
            isFile: true,
            name: entry.name,
          };
        }
        const url = normalizeImageSrc(entry);
        return {
          key: `url-${entry}-${index}`,
          url,
          isFile: false,
          name: url?.split("/").pop() || String(entry),
        };
      }),
    [items, objectUrls]
  );

  const remaining = Math.max(0, maxImages - items.length);
  const isFull = remaining === 0;

  const describeRejection = useCallback(
    (rejections: FileRejection[]): string => {
      const code = rejections[0]?.errors?.[0]?.code;
      if (code === "file-too-large") {
        return t("file_is_larger_than_the_limit", { max: `${MAX_SIZE_MB} MB` });
      }
      if (code === "file-invalid-type") {
        return tCommon("that_file_type_is_not_supported");
      }
      return (
        rejections[0]?.errors?.[0]?.message || t("that_file_could_not_be_used")
      );
    },
    [t]
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setRejection(rejections.length > 0 ? describeRejection(rejections) : null);
      if (accepted.length === 0) return;

      /**
       * The surplus is REPORTED, not silently dropped. Selecting ten files
       * into three free slots is a mistake worth naming — the alternative is a
       * picker that appears to have ignored seven files for no reason.
       */
      const taken = accepted.slice(0, remaining);
      if (accepted.length > remaining) {
        setRejection(t("only_images_can_be_added", { count: remaining }));
      }
      if (taken.length === 0) return;

      // Synchronously, and through a fresh array. The parent owns the upload;
      // anything asynchronous here only opens a window in which the form holds
      // a stale value.
      field.onChange([...items, ...taken]);
    },
    [describeRejection, field, items, remaining, t]
  );

  const { getRootProps, getInputProps, open, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_FORMATS.reduce(
        (acc, format) => {
          acc[format] = [];
          return acc;
        },
        {} as Record<string, string[]>
      ),
      multiple: true,
      maxSize: MAX_SIZE_MB * 1024 * 1024,
      disabled: isFull,
      // The tiles carry their own buttons, and a click that lands on one must
      // not also open the file dialog. Opening is `open()` from the button
      // below instead — the same fix the single picker needed.
      noClick: true,
      noKeyboard: true,
    });

  const removeAt = useCallback(
    (index: number) => {
      setRejection(null);
      field.onChange(items.filter((_, position) => position !== index));
    },
    [field, items]
  );

  const moveBy = useCallback(
    (index: number, offset: number) => {
      const target = index + offset;
      if (target < 0 || target >= items.length) return;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      field.onChange(next);
    },
    [field, items]
  );

  const message = rejection || error;
  const hasError = Boolean(rejection) || Boolean(error);

  return (
    <div className="w-full">
      {title && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label className="text-sm font-medium">{title}</label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {items.length} / {maxImages}
          </span>
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "rounded-md border border-dashed p-3 transition-colors",
          hasError
            ? "border-destructive/50 bg-destructive/5"
            : isDragActive && !isDragReject
              ? "border-primary bg-primary/5"
              : "border-border bg-surface-2"
        )}
      >
        <input {...getInputProps()} />

        {slots.length > 0 && (
          <ul className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((slot, index) => (
              <li
                key={slot.key}
                /* `bg-surface-3`, not `bg-card`. A thumbnail is not a card —
                   it carries no card anatomy and it sits INSIDE the dropzone's
                   `surface-2`, so the ramp's next step up is what makes it read
                   as raised (R3). Painting it `bg-card` would also be Ledger
                   drift: a card shell owns a fixed radius, and these tiles are
                   deliberately tighter than one. */
                className="overflow-hidden rounded-md border border-border bg-surface-3"
              >
                <div className="relative aspect-square bg-surface-2">
                  {slot.url ? (
                    /* A plain <img>: the source is either a blob: URL that
                       next/image cannot optimise or a path under /uploads that
                       is already sized by sharp on the way in. */
                    <img
                      src={slot.url}
                      alt={slot.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {/* Position, not decoration — this is the number that
                      decides the order on the storefront. */}
                  <span className="absolute left-1 top-1 rounded-sm bg-overlay px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-overlay-foreground">
                    {index + 1}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 border-t border-border p-1">
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveBy(index, -1)}
                      aria-label={t("move_image_earlier")}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === slots.length - 1}
                      onClick={() => moveBy(index, 1)}
                      aria-label={t("move_image_later")}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive-ink"
                    onClick={() => removeAt(index)}
                    aria-label={tCommon("remove")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state gets a box, not a one-line hint. A field whose whole
            purpose is "drop things here" has to look like somewhere things can
            be dropped; once there are tiles to look at, the same controls
            collapse to the strip below them. */}
        <div
          className={cn(
            "flex gap-3",
            slots.length === 0
              ? "flex-col items-center justify-center py-10 text-center"
              : "flex-wrap items-center justify-between"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-2 text-xs text-muted-foreground",
              slots.length === 0 && "flex-col text-sm"
            )}
          >
            {slots.length === 0 ? (
              <ImageIcon className="h-8 w-8" />
            ) : (
              <Upload className="h-4 w-4 shrink-0" />
            )}
            <span className="min-w-0">
              {isFull
                ? t("gallery_is_full_remove_an_image_to_add_another")
                : isDragActive
                  ? t("drop_the_images_to_add_them")
                  : t("drag_images_here_or_browse_to_add_several_at_once")}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFull}
            onClick={() => open()}
          >
            {t("add_images")}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "mt-1 flex items-start gap-1.5 text-xs",
            hasError ? "text-destructive-ink" : "text-muted-foreground"
          )}
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{message}</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {description ? `${description} ` : ""}
          {t("images_are_resized_to_fit_within_dimensions", {
            width: maxWidth,
            height: maxHeight,
          })}
        </p>
      )}
    </div>
  );
}
