import React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";

/* Mounts at rest, like every other data-table state. The four variant sets that
   used to sit here ran a 0.1 -> 0.2 -> 0.3 -> 0.4 delay ladder over a `y: 20`
   panel, a `scale: 0.5` icon and two `y: 10` lines — half a second of assembly
   in front of a message that is the same every time and depends on no request.
   The blurred backdrop and the dimmed table behind it are now plain CSS: they
   have one appearance, so there is nothing to animate them from. The pulsing
   halo stays; it is a loop, not an entrance. */

interface NoAccessStateProps {
  children: React.ReactNode;
  title: string;
}

export function NoAccessState({ children, title }: NoAccessStateProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  // Use the title directly (already human-readable)
  const displayTitle = title || "";
  return (
    <div className="relative p-2 -m-2">
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-xs">
        <div className="text-center">
          <div className="relative mx-auto w-fit">
            <m.div
              className="absolute inset-0 rounded-full bg-destructive/20 blur-xl"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut" as const,
              }}
            />
            <AlertCircle className="h-16 w-16 text-muted-foreground relative z-10" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {tCommon("access_denied")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("you_dont_have_permission_to_access")}{" "}
            {displayTitle}
          </p>
        </div>
      </div>
      <div className="pointer-events-none opacity-50">{children}</div>
    </div>
  );
}
