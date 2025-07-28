"use client";
import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/store";

const MobileMenuHandler = () => {
  const { mobileMenu, setMobileMenu } = useSidebar();

  return (
    <div>
      <Button
        onClick={() => setMobileMenu(!mobileMenu)}
        variant="ghost"
        size="icon"
        className="relative h-11 w-11 hover:bg-primary/10 dark:hover:bg-muted dark:hover:bg-opacity-50 hover:text-primary text-foreground dark:text-foreground rounded-full"
      >
        <Menu className="h-7 w-7" />
      </Button>
    </div>
  );
};

export default MobileMenuHandler;
