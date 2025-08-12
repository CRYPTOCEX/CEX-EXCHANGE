import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  BarChart3, 
  HelpCircle, 
  Globe, 
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSettings } from "@/hooks/use-settings";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  "The most trusted cryptocurrency platform with advanced trading tools and secure storage.";

export function SiteFooter() {
  const t = useTranslations("components/partials/footer/user-footer");
  const { resolvedTheme } = useTheme();
  const { extensions, settingsFetched } = useSettings();
  const isDark = resolvedTheme === "dark";

  // Helper function to check if extension is enabled
  const hasExtension = (name: string) => {
    if (!extensions) return false;
    return extensions.includes(name);
  };

  // Filter trading links based on enabled extensions
  const tradingLinks = [
    { name: "Spot Trading", href: "/trade" }, // Always available
    { name: "Binary Options", href: "/binary" }, // Always available  
    { name: "Markets", href: "/market" }, // Always available
    { name: "Investment", href: "/investment", extension: "investment" },
    { name: "Staking", href: "/staking", extension: "staking" }
  ].filter(link => !link.extension || hasExtension(link.extension));

  // Filter company links based on enabled extensions
  const companyLinks = [
    { name: "About", href: "/about" }, // Always available
    { name: "Blog", href: "/blog" }, // Always available  
    { name: "Affiliate", href: "/affiliate", extension: "mlm" },
    { name: "P2P Trading", href: "/p2p", extension: "p2p" },
    { name: "Ecommerce", href: "/ecommerce", extension: "ecommerce" }
  ].filter(link => !link.extension || hasExtension(link.extension));

  // Don't render footer until settings are fetched to avoid layout shift
  if (!settingsFetched) {
    return null;
  }

  return (
    <footer className="relative overflow-hidden">
      {/* Background with gradient and animated elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-zinc-950 dark:via-blue-950/30 dark:to-purple-950/30" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 md:gap-12">
            {/* Brand Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-4"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{siteName}</span>
              </div>
              
              <p className="text-slate-600 dark:text-gray-300 mb-6 leading-relaxed max-w-md">
                {siteDescription}
              </p>
            </motion.div>

            {/* Trading Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                {t("Trading")}
              </h3>
              <ul className="space-y-3">
                {tradingLinks.map((link, index) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  >
                    <Link
                      href={link.href}
                      className="text-slate-600 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                      {link.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Support & Learn */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-6 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                {t("Support")}
              </h3>
              <ul className="space-y-3">
                {[
                  { name: "Support Center", href: "/support" },
                  { name: "Contact Us", href: "/contact" },
                  { name: "FAQ", href: "/faq" },
                  { name: "User Profile", href: "/user/profile" },
                  { name: "KYC", href: "/user/kyc" }
                ].map((link, index) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  >
                    <Link
                      href={link.href}
                      className="text-slate-600 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                      {link.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Company */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-2"
            >
              <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-500 dark:text-green-400" />
                {t("Company")}
              </h3>
              <ul className="space-y-3">
                {companyLinks.map((link, index) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  >
                    <Link
                      href={link.href}
                      className="text-slate-600 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                      {link.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-black/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 md:px-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-slate-500 dark:text-gray-400 text-sm text-center md:text-left"
              >
                © 2025 {siteName}. {t("all_rights_reserved")}.
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-wrap justify-center gap-6 text-sm"
              >
                {[
                  { name: "Privacy Policy", href: "/privacy" },
                  { name: "Terms of Service", href: "/terms" }
                ].map((link, index) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors duration-300"
                  >
                    {link.name}
                  </Link>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
