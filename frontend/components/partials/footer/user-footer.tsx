"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  TrendingUp,
  BarChart3,
  Globe,
  Coins,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import Image from "next/image";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  "The most trusted cryptocurrency platform with advanced trading tools and secure storage.";
const binaryEnabled = process.env.NEXT_PUBLIC_BINARY_STATUS === "true";

// Social link interface matching the settings configuration
interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string;
}

interface FooterLink {
  name: string;
  href: string;
  icon?: React.ElementType;
}

interface FooterSection {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  links: FooterLink[];
}

export function SiteFooter() {
  const t = useTranslations("common");
  const tComponents = useTranslations("components");
  const { extensions, settings, settingsFetched } = useSettings();

  const hasExtension = (name: string) => extensions?.includes(name) ?? false;
  const getSetting = (key: string) => {
    if (!settings) return false;
    const value = settings[key];
    return value === true || value === "true";
  };

  const isSpotEnabled = getSetting("spotWallets");
  const isEcosystemEnabled = hasExtension("ecosystem");
  const showSpotTrading = isSpotEnabled || isEcosystemEnabled;

  // Get social links from customSocialLinks setting
  const socialLinks = useMemo(() => {
    if (!settings) return [];
    const customLinks = settings.customSocialLinks;
    if (!customLinks) return [];

    try {
      const parsed: SocialLink[] = typeof customLinks === 'string'
        ? JSON.parse(customLinks)
        : customLinks;

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((link) => link.url && link.url.trim() !== "")
        .map((link) => ({
          id: link.id,
          label: link.name,
          href: link.url,
          icon: link.icon || "/img/social/globe.svg",
        }));
    } catch {
      return [];
    }
  }, [settings]);

  const footerSections = useMemo<FooterSection[]>(() => {
    const sections: FooterSection[] = [];

    // Trading Section
    const tradingLinks: FooterLink[] = [];
    if (showSpotTrading) {
      tradingLinks.push({ name: "Spot Trading", href: "/trade" });
    }
    if (binaryEnabled) {
      tradingLinks.push({ name: "Binary Options", href: "/binary" });
    }
    if (hasExtension("futures")) {
      tradingLinks.push({ name: "Futures", href: "/futures" });
    }
    if (hasExtension("p2p")) {
      tradingLinks.push({ name: "P2P Trading", href: "/p2p" });
    }
    if (hasExtension("forex")) {
      tradingLinks.push({ name: "Forex", href: "/forex" });
    }
    tradingLinks.push({ name: "Markets", href: "/market" });

    if (tradingLinks.length > 0) {
      sections.push({
        title: "Trading",
        icon: BarChart3,
        iconColor: "text-blue-500 dark:text-blue-400",
        links: tradingLinks,
      });
    }

    // Products Section
    const productLinks: FooterLink[] = [];
    if (getSetting("investment")) {
      productLinks.push({ name: "Investment", href: "/investment" });
    }
    if (hasExtension("staking")) {
      productLinks.push({ name: "Staking", href: "/staking" });
    }
    if (hasExtension("ico")) {
      productLinks.push({ name: "Token Sales", href: "/ico" });
    }
    if (hasExtension("ai_investment")) {
      productLinks.push({ name: "AI Investment", href: "/ai/investment" });
    }
    if (hasExtension("nft")) {
      productLinks.push({ name: "NFT Marketplace", href: "/nft" });
    }
    if (hasExtension("ecommerce")) {
      productLinks.push({ name: "Store", href: "/ecommerce" });
    }

    if (productLinks.length > 0) {
      sections.push({
        title: "Products",
        icon: Coins,
        iconColor: "text-emerald-500 dark:text-emerald-400",
        links: productLinks,
      });
    }

    // Resources Section
    const resourceLinks: FooterLink[] = [
      { name: "API Documentation", href: "/api-docs" },
      { name: "Help Center", href: "/support" },
    ];
    if (hasExtension("knowledge_base")) {
      resourceLinks.push({ name: "FAQ", href: "/faq" });
    }
    resourceLinks.push({ name: "Blog", href: "/blog" });

    sections.push({
      title: "Resources",
      icon: BookOpen,
      iconColor: "text-amber-500 dark:text-amber-400",
      links: resourceLinks,
    });

    // Company Section
    sections.push({
      title: "Company",
      icon: Globe,
      iconColor: "text-purple-500 dark:text-purple-400",
      links: [
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
        { name: "KYC Verification", href: "/user/kyc" },
        ...(hasExtension("mlm") ? [{ name: "Affiliate", href: "/affiliate" }] : []),
      ],
    });

    return sections;
  }, [extensions, settings, showSpotTrading]);

  if (!settingsFetched) {
    return (
      <footer className="bg-muted/30 py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative bg-muted/30 border-t">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-background/50 to-transparent pointer-events-none" />

      <div className="relative">
        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Top Section - Logo and Social */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12 pb-10 lg:pb-12 border-b border-border/50">
            {/* Brand */}
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <TrendingUp className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">{siteName}</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {siteDescription}
              </p>
              {/* CTA Button */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Social Links from Settings */}
            {socialLinks.length > 0 && (
              <div className="flex flex-col items-start lg:items-end gap-4">
                <span className="text-sm text-muted-foreground">Follow Us</span>
                <div className="flex items-center gap-3 flex-wrap">
                  {socialLinks.map((social) => (
                    <a
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      title={social.label}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Image
                        src={social.icon}
                        alt={social.label}
                        width={20}
                        height={20}
                        className="dark:invert opacity-70 hover:opacity-100 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-12 py-10 lg:py-12">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-foreground font-semibold text-sm mb-4 flex items-center gap-2">
                  <section.icon className={cn("w-4 h-4", section.iconColor)} />
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors inline-block"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 bg-muted/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm text-center sm:text-left">
                © {new Date().getFullYear()} {siteName}. {tComponents("all_rights_reserved")}.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {[
                  { name: "Privacy", href: "/privacy" },
                  { name: "Terms", href: "/terms" },
                ].map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
