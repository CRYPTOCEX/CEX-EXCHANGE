"use client";
import { cn } from "@/lib/utils";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useSidebar } from "@/store";
import { useMediaQuery } from "@/hooks/use-media-query";

function LockLink({
  href,
  children,
  subItem,
}: {
  href: string;
  children: React.ReactNode;
  subItem: any;
}) {
  const { setMobileMenu } = useSidebar();
  const isMobile = useMediaQuery("(max-width: 1279px)");

  const handleClick = () => {
    if (isMobile) {
      setMobileMenu(false);
    }
  };

  if (subItem.badge) {
    return (
      <div className="text-sm flex space-x-3 items-center transition-all duration-150 opacity-50 cursor-not-allowed">
        <span className="h-2 w-2 rounded-full border border-muted-foreground inline-block flex-none"></span>
        <div className="flex-1 truncate flex text-muted-foreground">
          <div className="flex-1 truncate">{subItem.title}</div>
          <Badge className="leading-0 capitalize flex-none px-1 text-xs font-normal">
            {subItem.badge}
          </Badge>
        </div>
      </div>
    );
  } else {
    return <Link href={href as any} onClick={handleClick}>{children}</Link>;
  }
}

const SubMenuItem = ({
  subItem,
  isActive = false,
}: {
  subItem: any;
  isActive?: boolean;
}) => {
  return (
    <LockLink href={subItem.href} subItem={subItem}>
      <div
        className={cn(
          "text-sm capitalize font-normal flex gap-3 items-center transition-all duration-150 rounded dark:hover:text-primary",
          { "text-primary": isActive, "text-muted-foreground": !isActive }
        )}
      >
        <span className="flex-1 truncate">{subItem.title}</span>
      </div>
    </LockLink>
  );
};

export default SubMenuItem;
