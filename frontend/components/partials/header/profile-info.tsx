"use client";
import { useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { ProfileMenuPanel, getUserInitials } from "./profile-menu";

interface ProfileInfoProps {
  square?: boolean;
  /**
   * Forwarded straight to `ProfileMenuPanel`. Read its `balanceSlot` note: a
   * terminal whose money is not the custodial ledger hands its own block down
   * rather than having this component learn about it.
   */
  balanceSlot?: (ctx: { onNavigate?: () => void }) => ReactNode;
}

/**
 * The avatar trigger for the terminal-style headers (binary, /dex/swap,
 * /trade/pro, the notifications header) - everything that reaches the profile
 * through `AuthHeaderControls` rather than through `site-header`'s own
 * `ProfileButton`.
 *
 * THE PANEL ITSELF IS `ProfileMenuPanel`, shared with `site-header.tsx`; this
 * file owns only the trigger and the frame. Radix stays because it PORTALS:
 * these headers are dense, clipped, transformed terminal chrome, and an
 * absolutely positioned panel would be cut off by an ancestor in at least two
 * of them. The menu is controlled so every link inside the panel can close it
 * through `onNavigate` - the panel contains no `DropdownMenuItem`s, so nothing
 * else would.
 */
const ProfileInfo = ({ square = false, balanceSlot }: ProfileInfoProps) => {
  const t = useTranslations("components");
  const { user } = useUserStore();
  const [open, setOpen] = useState(false);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      user.email ||
      t("guest_user")
    : t("guest_user");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <div
          data-slot="profile-trigger"
          className={`flex items-center ${square ? "h-10 w-10 justify-center" : ""}`}
        >
          <Avatar
            className={
              square
                ? "h-10 w-10 rounded-none"
                : /* Cutout halo, same as the 9 `ring-white` avatars Phase 16c fixed
               - as a BORDER rather than a ring, which is why the ring sweep
               missed it. `--card` is `0 0% 100%` in light mode, so this is a
               byte-identical no-op there and removes a stark white outline in
               dark. */
                  "h-9 w-9 border-2 border-card shadow-sm hover:shadow-md transition-shadow duration-200"
            }
          >
            {/* No `/img/avatars/placeholder.webp` fallback. A generic grey
                silhouette is a request over the wire for less than the two
                letters already sitting behind it, and it made this trigger the
                only one of the three profile controls that did NOT show the
                user's initials - the core header's tile and the panel's own
                avatar both do. */}
            {user?.avatar ? (
              <AvatarImage
                src={user.avatar}
                alt={`Avatar of ${displayName}`}
                className={square ? "rounded-none" : ""}
              />
            ) : null}
            <AvatarFallback
              className={`bg-primary text-primary-foreground font-medium text-sm ${square ? "rounded-none" : ""}`}
            >
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>

      {/* `p-0` because the panel paints its own rows edge to edge, and no
          `overflow-hidden`: the content already carries
          `max-h-(--radix-dropdown-menu-content-available-height)` +
          `overflow-y-auto`, and overriding that with a clip would cut the
          bottom of the panel off on short viewports instead of scrolling it.
          The panel's inner wrapper does the corner rounding. */}
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="w-[calc(100vw-16px)] max-w-[360px] rounded-xl p-0 shadow-2xl sm:w-[360px]"
      >
        <ProfileMenuPanel
          className="overflow-hidden rounded-xl"
          balanceSlot={balanceSlot}
          onNavigate={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileInfo;
