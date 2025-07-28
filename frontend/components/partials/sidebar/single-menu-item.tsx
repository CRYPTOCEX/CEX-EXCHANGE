import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { Icon } from "@iconify/react";
import { useSidebar } from "@/store";
import { useMediaQuery } from "@/hooks/use-media-query";

const SingleMenuItem = ({
  item,
  collapsed,
  hovered,
  isActive,
}: {
  item: any;
  collapsed: boolean;
  hovered: boolean;
  isActive: boolean;
}) => {
  const { badge, href, title, icon } = item;
  const { setMobileMenu } = useSidebar();
  const isMobile = useMediaQuery("(max-width: 1279px)");

  const handleClick = () => {
    if (isMobile) {
      setMobileMenu(false);
    }
  };

  return (
    <Link href={href} onClick={handleClick}>
      <>
        {!collapsed || hovered ? (
          <div
            className={cn(
              "flex gap-3 group text-foreground dark:text-foreground font-medium text-sm capitalize px-[10px] py-3 rounded cursor-pointer hover:bg-primary hover:text-primary-foreground dark:hover:text-black",
              { 
                "bg-primary text-primary-foreground dark:bg-primary dark:text-black": isActive
              }
            )}
          >
            <span className="grow-0">
              {icon ? (
                <Icon icon={icon} className="w-5 h-5" />
              ) : (
                <Icon icon="solar:document-line-duotone" className="w-5 h-5" />
              )}
            </span>
            <div className="text-box grow">{title}</div>
            {badge && <Badge className="rounded">{badge}</Badge>}
          </div>
        ) : (
          <div>
            <span
              className={cn(
                "h-12 w-12 mx-auto rounded-md transition-all duration-300 inline-flex flex-col items-center justify-center relative",
                {
                  "bg-primary text-primary-foreground dark:bg-primary dark:text-black": isActive,
                  "text-muted-foreground": !isActive,
                }
              )}
            >
              {icon ? (
                <Icon icon={icon} className="w-6 h-6" />
              ) : (
                <Icon icon="solar:document-line-duotone" className="w-6 h-6" />
              )}
            </span>
          </div>
        )}
      </>
    </Link>
  );
};

export default SingleMenuItem;
