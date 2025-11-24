"use client";

import React from "react";
import { useThemeStore } from "@/store";
import FooterLayout from "./footer-layout";
import { useMounted } from "@/hooks/use-mounted";
import { siteName } from "@/lib/siteInfo";
import { footerVariants } from "@/lib/variants/layout";
const Footer = () => {
  const { footerType } = useThemeStore();
  const mounted = useMounted();
  if (!mounted || footerType === "hidden") {
    return null;
  }

  // Convert footerType to our variant value: "sticky" or "default"
  const finalFooterType = footerType === "sticky" ? "sticky" : "default";
  const footerClasses = footerVariants({
    footerType: finalFooterType,
  });
  return (
    <div className="w-full z-50">
      <FooterLayout className={footerClasses}>
        <FooterContent />
      </FooterLayout>
    </div>
  );
};
export default Footer;
const FooterContent = () => {
  return (
    <div className="block md:flex md:justify-between text-muted-foreground">
      <p className="sm:mb-0 text-xs md:text-sm">
        COPYRIGHT © {new Date().getFullYear()} {siteName} All rights Reserved
      </p>
    </div>
  );
};
