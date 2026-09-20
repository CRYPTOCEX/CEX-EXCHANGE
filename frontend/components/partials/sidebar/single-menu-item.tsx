import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { Icon } from "@/components/ui/icon";
import { FileText } from "lucide-react";
import { useSidebar } from "@/store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMenuTranslations } from "@/components/partials/menu-translator";

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
  const { badge, href, icon } = item;
  const { setMobileMenu } = useSidebar();
  const isMobile = useMediaQuery("(max-width: 1279px)");
  const { getTitle } = useMenuTranslations();

  const title = getTitle(item);

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
              "flex gap-3 group text-foreground font-medium text-sm capitalize px-[10px] py-3 rounded cursor-pointer hover:bg-primary hover:text-primary-foreground",
              {
                "bg-primary text-primary-foreground": isActive
              }
            )}
          >
            <span className="grow-0">
              {/* `fallback` covers BOTH the no-icon case the ternary used to
                  handle and a stored name the local table cannot resolve —
                  which previously drew nothing at all. */}
              <Icon icon={icon} className="w-5 h-5" fallback={FileText} />
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
                  "bg-primary text-primary-foreground": isActive,
                  "text-muted-foreground": !isActive,
                }
              )}
            >
              <Icon icon={icon} className="w-6 h-6" fallback={FileText} />
            </span>
          </div>
        )}
      </>
    </Link>
  );
};

export default SingleMenuItem;
