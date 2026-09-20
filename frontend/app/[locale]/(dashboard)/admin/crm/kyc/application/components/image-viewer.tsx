import { Button } from "@/components/ui/button";
import { Minimize } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface FullScreenImageViewerProps {
  /** Null closes the viewer. Keeping the component mounted is what lets the
      close animation run — see the note below. */
  src: string | null;
  onClose: () => void;
}

/**
 * `open` used to be hard-true while the PARENT mounted this conditionally
 * inside an <AnimatePresence>. Once the root became <Dialog> rather than a
 * motion element, AnimatePresence had nothing to track, so the tree was torn
 * out synchronously with `open` still true — Radix never saw an open->closed
 * transition and `data-[state=closed]:animate-out` never played. The viewer
 * snapped shut while every other migrated dialog faded.
 *
 * Driving `open` from `src` and staying mounted gives Radix the transition.
 */
export const FullScreenImageViewer = ({
  src,
  onClose,
}: FullScreenImageViewerProps) => {
  const t = useTranslations("dashboard_admin");

  return (
    <Dialog
      open={Boolean(src)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        size="4xl"
        hideCloseButton
        aria-describedby={undefined}
        className="border-0 bg-transparent p-0 shadow-none no-print"
      >
        <DialogTitle className="sr-only">{t("full_screen_view")}</DialogTitle>
        <div className="relative max-w-4xl max-h-[90vh] w-full">
          {/* `text-white` was the untokenised half of this pair: the fill is
              already `--overlay`, so the ink is `--overlay-foreground` — light in
              both themes for the same reason the fill is dark in both, since the
              ground here is the image, not the page. */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 bg-overlay/50 hover:bg-overlay/70 text-overlay-foreground hover:text-overlay-foreground z-10"
            onClick={onClose}
          >
            <Minimize className="h-5 w-5" />
          </Button>
          <img
            src={src || "/placeholder.svg"}
            alt={t("full_screen_view")}
            className="w-full h-full object-contain rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
