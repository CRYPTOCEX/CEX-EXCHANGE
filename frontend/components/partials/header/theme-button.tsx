"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";

const ThemeButton: React.FC<ButtonProps> = ({ className, ...props }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative md:h-9 md:w-9 h-8 w-8 hover:bg-muted dark:hover:bg-muted",
        "data-[state=open]:bg-muted dark:data-[state=open]:bg-muted",
        "hover:text-primary text-foreground dark:text-foreground rounded-full",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      {...props}
    >
      {isDark ? (
        <Icon icon="carbon:moon" className="h-5 w-5" />
      ) : (
        <Icon icon="carbon:sun" className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ThemeButton;
