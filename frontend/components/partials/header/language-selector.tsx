"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import LanguageDrawer from "./language-drawer";

// Get current language data from environment
const getCurrentLanguageData = (locale: string) => {
  const languageMap: Record<string, { name: string; flag: string }> = {
    af: { name: "Afrikaans", flag: "/img/flag/za.webp" },
    sq: { name: "Albanian", flag: "/img/flag/al.webp" },
    am: { name: "Amharic", flag: "/img/flag/et.webp" },
    ar: { name: "Arabic", flag: "/img/flag/iq.webp" },
    hy: { name: "Armenian", flag: "/img/flag/am.webp" },
    as: { name: "Assamese", flag: "/img/flag/bd.webp" },
    az: { name: "Azerbaijani", flag: "/img/flag/az.webp" },
    bn: { name: "Bengali", flag: "/img/flag/bd.webp" },
    bs: { name: "Bosnian", flag: "/img/flag/ba.webp" },
    bg: { name: "Bulgarian", flag: "/img/flag/bg.webp" },
    yue: { name: "Cantonese", flag: "/img/flag/hk.webp" },
    ca: { name: "Catalan", flag: "/img/flag/es.webp" },
    hr: { name: "Croatian", flag: "/img/flag/hr.webp" },
    cs: { name: "Czech", flag: "/img/flag/cz.webp" },
    da: { name: "Danish", flag: "/img/flag/dk.webp" },
    dv: { name: "Divehi", flag: "/img/flag/mv.webp" },
    nl: { name: "Dutch", flag: "/img/flag/nl.webp" },
    en: { name: "English", flag: "/img/flag/us.webp" },
    et: { name: "Estonian", flag: "/img/flag/ee.webp" },
    fj: { name: "Fijian", flag: "/img/flag/fj.webp" },
    fil: { name: "Filipino", flag: "/img/flag/ph.webp" },
    fi: { name: "Finnish", flag: "/img/flag/fi.webp" },
    fr: { name: "French", flag: "/img/flag/fr.webp" },
    gl: { name: "Galician", flag: "/img/flag/es.webp" },
    ka: { name: "Georgian", flag: "/img/flag/ge.webp" },
    de: { name: "German", flag: "/img/flag/de.webp" },
    el: { name: "Greek", flag: "/img/flag/gr.webp" },
    gu: { name: "Gujarati", flag: "/img/flag/in.webp" },
    ht: { name: "Haitian Creole", flag: "/img/flag/ht.webp" },
    hi: { name: "Hindi", flag: "/img/flag/in.webp" },
    hu: { name: "Hungarian", flag: "/img/flag/hu.webp" },
    is: { name: "Icelandic", flag: "/img/flag/is.webp" },
    id: { name: "Indonesian", flag: "/img/flag/id.webp" },
    ga: { name: "Irish", flag: "/img/flag/ie.webp" },
    it: { name: "Italian", flag: "/img/flag/it.webp" },
    ja: { name: "Japanese", flag: "/img/flag/jp.webp" },
    kn: { name: "Kannada", flag: "/img/flag/in.webp" },
    kk: { name: "Kazakh", flag: "/img/flag/kz.webp" },
    km: { name: "Khmer", flag: "/img/flag/kh.webp" },
    ko: { name: "Korean", flag: "/img/flag/kr.webp" },
    lv: { name: "Latvian", flag: "/img/flag/lv.webp" },
    lt: { name: "Lithuanian", flag: "/img/flag/lt.webp" },
    mk: { name: "Macedonian", flag: "/img/flag/mk.webp" },
    ms: { name: "Malay", flag: "/img/flag/my.webp" },
    ml: { name: "Malayalam", flag: "/img/flag/in.webp" },
    mt: { name: "Maltese", flag: "/img/flag/mt.webp" },
    mr: { name: "Marathi", flag: "/img/flag/in.webp" },
    nb: { name: "Norwegian", flag: "/img/flag/no.webp" },
    fa: { name: "Persian", flag: "/img/flag/ir.webp" },
    pl: { name: "Polish", flag: "/img/flag/pl.webp" },
    pt: { name: "Portuguese", flag: "/img/flag/pt.webp" },
    pa: { name: "Punjabi", flag: "/img/flag/in.webp" },
    ro: { name: "Romanian", flag: "/img/flag/ro.webp" },
    ru: { name: "Russian", flag: "/img/flag/ru.webp" },
    sk: { name: "Slovak", flag: "/img/flag/sk.webp" },
    sl: { name: "Slovenian", flag: "/img/flag/si.webp" },
    es: { name: "Spanish", flag: "/img/flag/es.webp" },
    sw: { name: "Swahili", flag: "/img/flag/ke.webp" },
    sv: { name: "Swedish", flag: "/img/flag/se.webp" },
    ta: { name: "Tamil", flag: "/img/flag/in.webp" },
    te: { name: "Telugu", flag: "/img/flag/in.webp" },
    th: { name: "Thai", flag: "/img/flag/th.webp" },
    tr: { name: "Turkish", flag: "/img/flag/tr.webp" },
    uk: { name: "Ukrainian", flag: "/img/flag/ua.webp" },
    ur: { name: "Urdu", flag: "/img/flag/pk.webp" },
    vi: { name: "Vietnamese", flag: "/img/flag/vn.webp" },
    cy: { name: "Welsh", flag: "/img/flag/gb-wls.webp" },
    zu: { name: "Zulu", flag: "/img/flag/za.webp" },
    zh: { name: "Chinese", flag: "/img/flag/cn.webp" },
  };

  return (
    languageMap[locale] || {
      name: locale.toUpperCase(),
      flag: "/img/flag/us.webp",
    }
  );
};

interface LanguageSelectorProps {
  variant?: "default" | "compact";
  showGlobe?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = "default",
  showGlobe = false,
}) => {
  const locale = useLocale();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const currentLanguage = getCurrentLanguageData(locale);

  return (
    <>
      {variant === "compact" ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDrawerOpen(true)}
          className={cn(
            "flex items-center gap-2 p-2 rounded-full transition-colors",
            "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
            "dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
          )}
        >
          {showGlobe ? (
            <Globe className="h-5 w-5" />
          ) : (
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <Image
                src={currentLanguage.flag}
                alt=""
                width={20}
                height={20}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <span className="w-6 h-6 rounded-full overflow-hidden">
            <Image
              src={currentLanguage.flag}
              alt=""
              width={24}
              height={24}
              className="w-full h-full object-cover rounded-full"
            />
          </span>
          <span className="text-sm text-muted-foreground capitalize">
            {currentLanguage.name}
          </span>
        </motion.button>
      )}

      <LanguageDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
};

export default LanguageSelector;
