import React from "react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface ListItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  title: string;
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

const ListItem = React.forwardRef<HTMLAnchorElement, ListItemProps>(
  ({ className, children, title, href = "#", ...props }, forwardedRef) => {
    return (
      <NavigationMenu.Link asChild>
        <Link
          href={href}
          className={cn(
            "select-none text-sm text-foreground rounded-md flex items-center gap-2 mb-4 last:mb-0 leading-none no-underline transition-colors hover:text-primary focus:text-primary",
            className
          )}
          {...props}
          ref={forwardedRef}
        >
          {children}
          <div className="capitalize">{title}</div>
        </Link>
      </NavigationMenu.Link>
    );
  }
);
ListItem.displayName = "ListItem";

export default ListItem;
