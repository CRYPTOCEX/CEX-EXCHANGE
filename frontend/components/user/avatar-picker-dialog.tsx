"use client";

/**
 * Two ways to get a face: pick one of ours, or bring your own.
 * ============================================================================
 *
 * WHY A CHOOSER AND NOT A FILE INPUT
 *
 * Clicking the avatar used to open the OS file dialog immediately — from the
 * hero and again, separately, from the Personal Information card. That is one
 * option presented as if it were the only one, and it is the expensive option:
 * it asks someone who just wants a face to go and find an image, crop it in
 * their head, and hope it reads at 28px. Twenty-six illustrated portraits have
 * shipped in `public/img/avatars` since the first release with nothing pointing
 * at them. This dialog is the pointer.
 *
 * WHY ONE COMPONENT FOR TWO CALL SITES
 *
 * The hero and the Personal Information tab each carried their own hidden
 * `<input type="file">`, their own `isUploadingAvatar`, and their own copy of
 * the `imageUploader` call — same arguments, same toast, written twice. Two
 * copies of an upload path is two places for a size limit or a directory to
 * drift, and the drift is invisible until someone uploads from the tab that was
 * not updated.
 *
 * THE STEP THAT LOOKS REDUNDANT IS NOT
 *
 * The dialog opens on the two choices rather than straight into the gallery.
 * Opening on the gallery would make "Upload photo" a small control competing
 * with twenty-six faces for attention — which is exactly backwards for the
 * person who arrived holding a photo.
 */

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { ArrowLeft, Camera, Check, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { imageUploader } from "@/utils/upload";
import { AVATAR_SETS, isBuiltInAvatar } from "@/lib/avatars";
import { useTranslations } from "next-intl";

type Step = "choose" | "gallery";

export function AvatarPickerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("common");
  const { toast } = useToast();
  const { user, updateAvatar } = useUserStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("choose");
  const [busy, setBusy] = useState(false);
  /**
   * The tile the pointer chose, held until the save resolves.
   *
   * Without it the grid has nothing to mark: `user.avatar` only changes after
   * the round trip, so every tile stays unselected while the request is in
   * flight and the click reads as having done nothing.
   */
  const [pending, setPending] = useState<string | null>(null);

  const current = user?.avatar ?? null;

  const reset = useCallback(() => {
    setStep("choose");
    setPending(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      /* Never close mid-save: the toast would land on a dialog that is already
         gone and the grid would keep a selection nothing committed. */
      if (busy) return;
      if (!next) reset();
      onOpenChange(next);
    },
    [busy, onOpenChange, reset]
  );

  const applyBuiltIn = useCallback(
    async (path: string) => {
      if (busy || path === current) return;
      setPending(path);
      setBusy(true);
      const ok = await updateAvatar(path);
      setBusy(false);
      if (ok) {
        toast({
          title: t("avatar_updated"),
          description: t("your_profile_picture_has_been_updated"),
        });
        reset();
        onOpenChange(false);
      } else {
        /* The store already surfaced the server's message; this only has to
           put the grid back where it was, or the failed tile keeps its tick. */
        setPending(null);
      }
    },
    [busy, current, onOpenChange, reset, t, toast, updateAvatar]
  );

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      /* Cleared here rather than after the await: leaving the value in place
         means picking the SAME file again fires no `change` event at all, so a
         retry after a failed upload silently does nothing. */
      e.target.value = "";
      if (!file) return;

      setBusy(true);
      const result = await imageUploader({
        file,
        dir: "avatars",
        size: { maxWidth: 400, maxHeight: 400 },
        /* Only an UPLOADED avatar is an old path worth reporting. A built-in is
           shared by every account on the install — see `isBuiltInAvatar`. */
        oldPath: isBuiltInAvatar(current) ? "" : current || "",
      });

      if (result.success && result.url) {
        const ok = await updateAvatar(result.url);
        if (ok) {
          toast({
            title: t("avatar_updated"),
            description: t("your_profile_picture_has_been_updated"),
          });
          setBusy(false);
          reset();
          onOpenChange(false);
          return;
        }
      }
      setBusy(false);
    },
    [current, onOpenChange, reset, t, toast, updateAvatar]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="2xl" className="max-h-[88vh] gap-0 overflow-hidden p-0">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleUpload}
        />

        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            {step === "gallery" ? (
              <button
                type="button"
                aria-label={t("back")}
                disabled={busy}
                onClick={() => setStep("choose")}
                className={cn(
                  "-ms-1 flex size-8 shrink-0 items-center justify-center rounded-lg",
                  "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : null}
            <div className="min-w-0">
              <DialogTitle>
                {step === "gallery" ? t("choose_avatar") : t("profile_picture")}
              </DialogTitle>
              <DialogDescription>
                {step === "gallery"
                  ? t("pick_one_of_the_built_in_avatars")
                  : t("pick_a_ready_made_avatar_or_upload_your_own")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {step === "choose" ? (
            <m.div
              key="choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid gap-3 p-6 sm:grid-cols-2"
            >
              <ChoiceCard
                icon={Sparkles}
                title={t("choose_avatar")}
                hint={t("count_ready_made_illustrations", {
                  count: AVATAR_SETS.reduce((n, s) => n + s.paths.length, 0),
                })}
                onClick={() => setStep("gallery")}
                disabled={busy}
              />
              <ChoiceCard
                icon={ImagePlus}
                title={t("upload_photo")}
                hint={t("png_jpg_or_webp_up_to_400px")}
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                busy={busy}
              />
            </m.div>
          ) : (
            <m.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="min-h-0 overflow-y-auto overscroll-contain p-6"
            >
              {AVATAR_SETS.map((set) => (
                <section key={set.id}>
                  {/* One set today, so no heading — a group label over the only
                      group is a promise of a second one that is not there. It
                      appears on its own the moment a second set is added. */}
                  {AVATAR_SETS.length > 1 ? (
                    <h3 className="pb-2 text-xs font-medium uppercase tracking-wider text-subtle-foreground">
                      {t(set.labelKey)}
                    </h3>
                  ) : null}
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                    {set.paths.map((path) => {
                      const selected = path === current;
                      const saving = pending === path && busy;
                      return (
                        <button
                          key={path}
                          type="button"
                          disabled={busy}
                          aria-pressed={selected}
                          onClick={() => void applyBuiltIn(path)}
                          className={cn(
                            "group relative aspect-square overflow-hidden rounded-xl",
                            "ring-1 transition-[box-shadow,transform] duration-150",
                            selected
                              ? "ring-2 ring-primary"
                              : "ring-border hover:ring-primary/50",
                            busy ? "cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"
                          )}
                        >
                          <Image
                            src={path}
                            alt=""
                            fill
                            sizes="96px"
                            className="object-cover"
                            /* These are flat illustrations with no photographic
                               detail, so the optimizer earns nothing and SVG
                               through the image endpoint 400s outright. */
                            unoptimized
                          />
                          {selected || saving ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-overlay/60">
                              {saving ? (
                                <Loader2 className="size-5 animate-spin text-overlay-foreground" />
                              ) : (
                                <Check className="size-5 text-overlay-foreground" />
                              )}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-subtle-foreground">
                  {t("prefer_your_own_picture")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 shrink-0"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  {t("upload_photo")}
                </Button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One of the two ways in.
 *
 * `<button>` OUTSIDE, `<Card>` inside, and no `interactive` — that is the shape
 * `card.tsx` documents for "the card is inside a control": `Card` renders a
 * plain div, so its `focus-visible` ring can never match on its own, and the
 * ring has to land on the thing that actually takes focus. Hand-rolling the
 * shell here instead cost two ratchet hits — a card radius off the Ledger ramp
 * and a re-typed primitive — for a surface the primitive already draws.
 */
function ChoiceCard({
  icon: Icon,
  title,
  hint,
  onClick,
  disabled,
  busy,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group w-full rounded-lg text-center",
        "focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
    >
      <Card
        padding="xl"
        className={cn(
          "flex flex-col items-center gap-3 transition-colors duration-150",
          disabled ? "" : "group-hover:border-primary/40 group-hover:bg-primary/5"
        )}
      >
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            "transition-colors group-hover:bg-primary/15 group-hover:text-primary-ink"
          )}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
        </span>
        <span className="space-y-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          <span className="block text-xs text-subtle-foreground">{hint}</span>
        </span>
      </Card>
    </button>
  );
}
