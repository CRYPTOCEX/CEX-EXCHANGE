import Logo from "@/components/elements/logo";
import { siteName } from "@/lib/siteInfo";
import { useSidebar } from "@/store";
import React from "react";

const SidebarLogo = ({
  hovered,
  isMobile = false,
}: {
  hovered?: boolean;
  isMobile?: boolean;
}) => {
  const { collapsed } = useSidebar();
  return (
    <div className="px-4 py-4">
      <div className="flex items-center">
        <div className="flex flex-1 items-center gap-x-3">
          <Logo className="h-8 w-8 text-primary" />
          {(!collapsed || hovered) && (
            <div className="flex-1 text-xl text-primary font-semibold">
              {siteName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarLogo;
