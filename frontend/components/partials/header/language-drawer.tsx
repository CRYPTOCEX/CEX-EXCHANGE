"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Globe, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
  popularity: number;
  rtl?: boolean;
}

// Comprehensive language mapping covering most ISO 639-1 and popular locale codes
const createComprehensiveLanguageMap = (): Record<
  string,
  Omit<Language, "code">
> => ({
  // Major Global Languages
  en: {
    name: "English",
    nativeName: "English",
    flag: "/img/flag/us.webp",
    region: "Global",
    popularity: 10,
  },
  zh: {
    name: "Chinese",
    nativeName: "中文",
    flag: "/img/flag/cn.webp",
    region: "Asia",
    popularity: 10,
  },
  es: {
    name: "Spanish",
    nativeName: "Español",
    flag: "/img/flag/es.webp",
    region: "Global",
    popularity: 9,
  },
  hi: {
    name: "Hindi",
    nativeName: "हिन्दी",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 8,
  },
  ar: {
    name: "Arabic",
    nativeName: "العربية",
    flag: "/img/flag/sa.webp",
    region: "Middle East",
    popularity: 9,
    rtl: true,
  },
  pt: {
    name: "Portuguese",
    nativeName: "Português",
    flag: "/img/flag/pt.webp",
    region: "Global",
    popularity: 8,
  },
  bn: {
    name: "Bengali",
    nativeName: "বাংলা",
    flag: "/img/flag/bd.webp",
    region: "Asia",
    popularity: 7,
  },
  ru: {
    name: "Russian",
    nativeName: "Русский",
    flag: "/img/flag/ru.webp",
    region: "Europe",
    popularity: 8,
  },
  ja: {
    name: "Japanese",
    nativeName: "日本語",
    flag: "/img/flag/jp.webp",
    region: "Asia",
    popularity: 8,
  },
  pa: {
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 3,
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    flag: "/img/flag/de.webp",
    region: "Europe",
    popularity: 8,
  },
  jv: {
    name: "Javanese",
    nativeName: "Basa Jawa",
    flag: "/img/flag/id.webp",
    region: "Asia",
    popularity: 4,
  },
  wu: {
    name: "Wu Chinese",
    nativeName: "吴语",
    flag: "/img/flag/cn.webp",
    region: "Asia",
    popularity: 3,
  },
  ms: {
    name: "Malay",
    nativeName: "Bahasa Melayu",
    flag: "/img/flag/my.webp",
    region: "Asia",
    popularity: 4,
  },
  te: {
    name: "Telugu",
    nativeName: "తెలుగు",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 3,
  },
  vi: {
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    flag: "/img/flag/vn.webp",
    region: "Asia",
    popularity: 5,
  },
  ko: {
    name: "Korean",
    nativeName: "한국어",
    flag: "/img/flag/kr.webp",
    region: "Asia",
    popularity: 6,
  },
  fr: {
    name: "French",
    nativeName: "Français",
    flag: "/img/flag/fr.webp",
    region: "Europe",
    popularity: 9,
  },
  mr: {
    name: "Marathi",
    nativeName: "मराठी",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 3,
  },
  ta: {
    name: "Tamil",
    nativeName: "தமிழ்",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 4,
  },
  ur: {
    name: "Urdu",
    nativeName: "اردو",
    flag: "/img/flag/pk.webp",
    region: "Asia",
    popularity: 4,
    rtl: true,
  },
  tr: {
    name: "Turkish",
    nativeName: "Türkçe",
    flag: "/img/flag/tr.webp",
    region: "Asia",
    popularity: 6,
  },
  it: {
    name: "Italian",
    nativeName: "Italiano",
    flag: "/img/flag/it.webp",
    region: "Europe",
    popularity: 7,
  },
  th: {
    name: "Thai",
    nativeName: "ไทย",
    flag: "/img/flag/th.webp",
    region: "Asia",
    popularity: 5,
  },
  gu: {
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 3,
  },
  jin: {
    name: "Jin Chinese",
    nativeName: "晋语",
    flag: "/img/flag/cn.webp",
    region: "Asia",
    popularity: 2,
  },
  ml: {
    name: "Malayalam",
    nativeName: "മലയാളം",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 2,
  },
  kn: {
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 2,
  },
  // European Languages
  pl: {
    name: "Polish",
    nativeName: "Polski",
    flag: "/img/flag/pl.webp",
    region: "Europe",
    popularity: 6,
  },
  nl: {
    name: "Dutch",
    nativeName: "Nederlands",
    flag: "/img/flag/nl.webp",
    region: "Europe",
    popularity: 6,
  },
  uk: {
    name: "Ukrainian",
    nativeName: "Українська",
    flag: "/img/flag/ua.webp",
    region: "Europe",
    popularity: 5,
  },
  el: {
    name: "Greek",
    nativeName: "Ελληνικά",
    flag: "/img/flag/gr.webp",
    region: "Europe",
    popularity: 4,
  },
  cs: {
    name: "Czech",
    nativeName: "Čeština",
    flag: "/img/flag/cz.webp",
    region: "Europe",
    popularity: 4,
  },
  sv: {
    name: "Swedish",
    nativeName: "Svenska",
    flag: "/img/flag/se.webp",
    region: "Europe",
    popularity: 4,
  },
  ro: {
    name: "Romanian",
    nativeName: "Română",
    flag: "/img/flag/ro.webp",
    region: "Europe",
    popularity: 4,
  },
  hu: {
    name: "Hungarian",
    nativeName: "Magyar",
    flag: "/img/flag/hu.webp",
    region: "Europe",
    popularity: 4,
  },
  be: {
    name: "Belarusian",
    nativeName: "Беларуская",
    flag: "/img/flag/by.webp",
    region: "Europe",
    popularity: 2,
  },
  bg: {
    name: "Bulgarian",
    nativeName: "Български",
    flag: "/img/flag/bg.webp",
    region: "Europe",
    popularity: 3,
  },
  hr: {
    name: "Croatian",
    nativeName: "Hrvatski",
    flag: "/img/flag/hr.webp",
    region: "Europe",
    popularity: 2,
  },
  sk: {
    name: "Slovak",
    nativeName: "Slovenčina",
    flag: "/img/flag/sk.webp",
    region: "Europe",
    popularity: 2,
  },
  sl: {
    name: "Slovenian",
    nativeName: "Slovenščina",
    flag: "/img/flag/si.webp",
    region: "Europe",
    popularity: 1,
  },
  da: {
    name: "Danish",
    nativeName: "Dansk",
    flag: "/img/flag/dk.webp",
    region: "Europe",
    popularity: 3,
  },
  fi: {
    name: "Finnish",
    nativeName: "Suomi",
    flag: "/img/flag/fi.webp",
    region: "Europe",
    popularity: 3,
  },
  nb: {
    name: "Norwegian Bokmål",
    nativeName: "Norsk Bokmål",
    flag: "/img/flag/no.webp",
    region: "Europe",
    popularity: 3,
  },
  nn: {
    name: "Norwegian Nynorsk",
    nativeName: "Norsk Nynorsk",
    flag: "/img/flag/no.webp",
    region: "Europe",
    popularity: 1,
  },
  no: {
    name: "Norwegian",
    nativeName: "Norsk",
    flag: "/img/flag/no.webp",
    region: "Europe",
    popularity: 3,
  },
  is: {
    name: "Icelandic",
    nativeName: "Íslenska",
    flag: "/img/flag/is.webp",
    region: "Europe",
    popularity: 1,
  },
  et: {
    name: "Estonian",
    nativeName: "Eesti",
    flag: "/img/flag/ee.webp",
    region: "Europe",
    popularity: 1,
  },
  lv: {
    name: "Latvian",
    nativeName: "Latviešu",
    flag: "/img/flag/lv.webp",
    region: "Europe",
    popularity: 1,
  },
  lt: {
    name: "Lithuanian",
    nativeName: "Lietuvių",
    flag: "/img/flag/lt.webp",
    region: "Europe",
    popularity: 2,
  },
  mt: {
    name: "Maltese",
    nativeName: "Malti",
    flag: "/img/flag/mt.webp",
    region: "Europe",
    popularity: 1,
  },
  ga: {
    name: "Irish",
    nativeName: "Gaeilge",
    flag: "/img/flag/ie.webp",
    region: "Europe",
    popularity: 1,
  },
  cy: {
    name: "Welsh",
    nativeName: "Cymraeg",
    flag: "/img/flag/gb-wls.webp",
    region: "Europe",
    popularity: 1,
  },
  eu: {
    name: "Basque",
    nativeName: "Euskera",
    flag: "/img/flag/es.webp",
    region: "Europe",
    popularity: 1,
  },
  ca: {
    name: "Catalan",
    nativeName: "Català",
    flag: "/img/flag/es.webp",
    region: "Europe",
    popularity: 3,
  },
  gl: {
    name: "Galician",
    nativeName: "Galego",
    flag: "/img/flag/es.webp",
    region: "Europe",
    popularity: 1,
  },
  mk: {
    name: "Macedonian",
    nativeName: "Македонски",
    flag: "/img/flag/mk.webp",
    region: "Europe",
    popularity: 1,
  },
  bs: {
    name: "Bosnian",
    nativeName: "Bosanski",
    flag: "/img/flag/ba.webp",
    region: "Europe",
    popularity: 1,
  },
  sq: {
    name: "Albanian",
    nativeName: "Shqip",
    flag: "/img/flag/al.webp",
    region: "Europe",
    popularity: 2,
  },
  sr: {
    name: "Serbian",
    nativeName: "Српски",
    flag: "/img/flag/rs.webp",
    region: "Europe",
    popularity: 2,
  },
  me: {
    name: "Montenegrin",
    nativeName: "Crnogorski",
    flag: "/img/flag/me.webp",
    region: "Europe",
    popularity: 1,
  },
  // Middle Eastern and Central Asian Languages
  fa: {
    name: "Persian",
    nativeName: "فارسی",
    flag: "/img/flag/ir.webp",
    region: "Middle East",
    popularity: 5,
    rtl: true,
  },
  he: {
    name: "Hebrew",
    nativeName: "עברית",
    flag: "/img/flag/il.webp",
    region: "Middle East",
    popularity: 3,
    rtl: true,
  },
  az: {
    name: "Azerbaijani",
    nativeName: "Azərbaycan",
    flag: "/img/flag/az.webp",
    region: "Asia",
    popularity: 2,
  },
  kk: {
    name: "Kazakh",
    nativeName: "Қазақша",
    flag: "/img/flag/kz.webp",
    region: "Asia",
    popularity: 2,
  },
  ky: {
    name: "Kyrgyz",
    nativeName: "Кыргызча",
    flag: "/img/flag/kg.webp",
    region: "Asia",
    popularity: 1,
  },
  tg: {
    name: "Tajik",
    nativeName: "Тоҷикӣ",
    flag: "/img/flag/tj.webp",
    region: "Asia",
    popularity: 1,
  },
  tk: {
    name: "Turkmen",
    nativeName: "Türkmen",
    flag: "/img/flag/tm.webp",
    region: "Asia",
    popularity: 1,
  },
  uz: {
    name: "Uzbek",
    nativeName: "Oʻzbek",
    flag: "/img/flag/uz.webp",
    region: "Asia",
    popularity: 2,
  },
  hy: {
    name: "Armenian",
    nativeName: "Հայերեն",
    flag: "/img/flag/am.webp",
    region: "Asia",
    popularity: 2,
  },
  ka: {
    name: "Georgian",
    nativeName: "ქართული",
    flag: "/img/flag/ge.webp",
    region: "Asia",
    popularity: 1,
  },
  ku: {
    name: "Kurdish",
    nativeName: "Kurdî",
    flag: "/img/flag/iq.webp",
    region: "Middle East",
    popularity: 2,
  },
  // African Languages
  sw: {
    name: "Swahili",
    nativeName: "Kiswahili",
    flag: "/img/flag/ke.webp",
    region: "Africa",
    popularity: 3,
  },
  am: {
    name: "Amharic",
    nativeName: "አማርኛ",
    flag: "/img/flag/et.webp",
    region: "Africa",
    popularity: 2,
  },
  ha: {
    name: "Hausa",
    nativeName: "Hausa",
    flag: "/img/flag/ng.webp",
    region: "Africa",
    popularity: 2,
  },
  yo: {
    name: "Yoruba",
    nativeName: "Yorùbá",
    flag: "/img/flag/ng.webp",
    region: "Africa",
    popularity: 2,
  },
  ig: {
    name: "Igbo",
    nativeName: "Igbo",
    flag: "/img/flag/ng.webp",
    region: "Africa",
    popularity: 1,
  },
  zu: {
    name: "Zulu",
    nativeName: "IsiZulu",
    flag: "/img/flag/za.webp",
    region: "Africa",
    popularity: 2,
  },
  xh: {
    name: "Xhosa",
    nativeName: "IsiXhosa",
    flag: "/img/flag/za.webp",
    region: "Africa",
    popularity: 1,
  },
  af: {
    name: "Afrikaans",
    nativeName: "Afrikaans",
    flag: "/img/flag/za.webp",
    region: "Africa",
    popularity: 3,
  },
  so: {
    name: "Somali",
    nativeName: "Soomaali",
    flag: "/img/flag/so.webp",
    region: "Africa",
    popularity: 1,
  },
  rw: {
    name: "Kinyarwanda",
    nativeName: "Ikinyarwanda",
    flag: "/img/flag/rw.webp",
    region: "Africa",
    popularity: 1,
  },
  // Asian Languages
  id: {
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    flag: "/img/flag/id.webp",
    region: "Asia",
    popularity: 6,
  },
  tl: {
    name: "Filipino",
    nativeName: "Filipino",
    flag: "/img/flag/ph.webp",
    region: "Asia",
    popularity: 4,
  },
  fil: {
    name: "Filipino",
    nativeName: "Filipino",
    flag: "/img/flag/ph.webp",
    region: "Asia",
    popularity: 4,
  },
  my: {
    name: "Burmese",
    nativeName: "မြန်မာ",
    flag: "/img/flag/mm.webp",
    region: "Asia",
    popularity: 2,
  },
  km: {
    name: "Khmer",
    nativeName: "ខ្មែរ",
    flag: "/img/flag/kh.webp",
    region: "Asia",
    popularity: 2,
  },
  lo: {
    name: "Lao",
    nativeName: "ລາວ",
    flag: "/img/flag/la.webp",
    region: "Asia",
    popularity: 1,
  },
  si: {
    name: "Sinhala",
    nativeName: "සිංහල",
    flag: "/img/flag/lk.webp",
    region: "Asia",
    popularity: 1,
  },
  ne: {
    name: "Nepali",
    nativeName: "नेपाली",
    flag: "/img/flag/np.webp",
    region: "Asia",
    popularity: 2,
  },
  dv: {
    name: "Divehi",
    nativeName: "ދިވެހި",
    flag: "/img/flag/mv.webp",
    region: "Asia",
    popularity: 1,
  },
  mn: {
    name: "Mongolian",
    nativeName: "Монгол",
    flag: "/img/flag/mn.webp",
    region: "Asia",
    popularity: 1,
  },
  // Pacific Languages
  fj: {
    name: "Fijian",
    nativeName: "Vosa Vakaviti",
    flag: "/img/flag/fj.webp",
    region: "Oceania",
    popularity: 1,
  },
  haw: {
    name: "Hawaiian",
    nativeName: "ʻŌlelo Hawaiʻi",
    flag: "/img/flag/us.webp",
    region: "Oceania",
    popularity: 1,
  },
  mi: {
    name: "Māori",
    nativeName: "Te Reo Māori",
    flag: "/img/flag/nz.webp",
    region: "Oceania",
    popularity: 1,
  },
  sm: {
    name: "Samoan",
    nativeName: "Gagana Samoa",
    flag: "/img/flag/ws.webp",
    region: "Oceania",
    popularity: 1,
  },
  to: {
    name: "Tongan",
    nativeName: "Lea Fakatonga",
    flag: "/img/flag/to.webp",
    region: "Oceania",
    popularity: 1,
  },
  // Americas Languages
  ht: {
    name: "Haitian Creole",
    nativeName: "Kreyòl",
    flag: "/img/flag/ht.webp",
    region: "Americas",
    popularity: 1,
  },
  qu: {
    name: "Quechua",
    nativeName: "Runasimi",
    flag: "/img/flag/pe.webp",
    region: "Americas",
    popularity: 1,
  },
  gn: {
    name: "Guarani",
    nativeName: "Avañe'ẽ",
    flag: "/img/flag/py.webp",
    region: "Americas",
    popularity: 1,
  },
  // Regional Variants
  "en-US": {
    name: "English (US)",
    nativeName: "English (US)",
    flag: "/img/flag/us.webp",
    region: "Americas",
    popularity: 10,
  },
  "en-GB": {
    name: "English (UK)",
    nativeName: "English (UK)",
    flag: "/img/flag/gb.webp",
    region: "Europe",
    popularity: 9,
  },
  "en-CA": {
    name: "English (Canada)",
    nativeName: "English (Canada)",
    flag: "/img/flag/ca.webp",
    region: "Americas",
    popularity: 8,
  },
  "en-AU": {
    name: "English (Australia)",
    nativeName: "English (Australia)",
    flag: "/img/flag/au.webp",
    region: "Oceania",
    popularity: 7,
  },
  "es-ES": {
    name: "Spanish (Spain)",
    nativeName: "Español (España)",
    flag: "/img/flag/es.webp",
    region: "Europe",
    popularity: 8,
  },
  "es-MX": {
    name: "Spanish (Mexico)",
    nativeName: "Español (México)",
    flag: "/img/flag/mx.webp",
    region: "Americas",
    popularity: 9,
  },
  "es-AR": {
    name: "Spanish (Argentina)",
    nativeName: "Español (Argentina)",
    flag: "/img/flag/ar.webp",
    region: "Americas",
    popularity: 7,
  },
  "pt-BR": {
    name: "Portuguese (Brazil)",
    nativeName: "Português (Brasil)",
    flag: "/img/flag/br.webp",
    region: "Americas",
    popularity: 8,
  },
  "pt-PT": {
    name: "Portuguese (Portugal)",
    nativeName: "Português (Portugal)",
    flag: "/img/flag/pt.webp",
    region: "Europe",
    popularity: 6,
  },
  "fr-FR": {
    name: "French (France)",
    nativeName: "Français (France)",
    flag: "/img/flag/fr.webp",
    region: "Europe",
    popularity: 9,
  },
  "fr-CA": {
    name: "French (Canada)",
    nativeName: "Français (Canada)",
    flag: "/img/flag/ca.webp",
    region: "Americas",
    popularity: 5,
  },
  "de-DE": {
    name: "German (Germany)",
    nativeName: "Deutsch (Deutschland)",
    flag: "/img/flag/de.webp",
    region: "Europe",
    popularity: 8,
  },
  "de-AT": {
    name: "German (Austria)",
    nativeName: "Deutsch (Österreich)",
    flag: "/img/flag/at.webp",
    region: "Europe",
    popularity: 6,
  },
  "de-CH": {
    name: "German (Switzerland)",
    nativeName: "Deutsch (Schweiz)",
    flag: "/img/flag/ch.webp",
    region: "Europe",
    popularity: 6,
  },
  "it-IT": {
    name: "Italian (Italy)",
    nativeName: "Italiano (Italia)",
    flag: "/img/flag/it.webp",
    region: "Europe",
    popularity: 7,
  },
  "it-CH": {
    name: "Italian (Switzerland)",
    nativeName: "Italiano (Svizzera)",
    flag: "/img/flag/ch.webp",
    region: "Europe",
    popularity: 4,
  },
  "zh-CN": {
    name: "Chinese (Simplified)",
    nativeName: "中文 (简体)",
    flag: "/img/flag/cn.webp",
    region: "Asia",
    popularity: 10,
  },
  "zh-TW": {
    name: "Chinese (Traditional)",
    nativeName: "中文 (繁體)",
    flag: "/img/flag/tw.webp",
    region: "Asia",
    popularity: 8,
  },
  "zh-HK": {
    name: "Chinese (Hong Kong)",
    nativeName: "中文 (香港)",
    flag: "/img/flag/hk.webp",
    region: "Asia",
    popularity: 6,
  },
  "ar-SA": {
    name: "Arabic (Saudi Arabia)",
    nativeName: "العربية (السعودية)",
    flag: "/img/flag/sa.webp",
    region: "Middle East",
    popularity: 8,
    rtl: true,
  },
  "ar-EG": {
    name: "Arabic (Egypt)",
    nativeName: "العربية (مصر)",
    flag: "/img/flag/eg.webp",
    region: "Middle East",
    popularity: 7,
    rtl: true,
  },
  "ar-AE": {
    name: "Arabic (UAE)",
    nativeName: "العربية (الإمارات)",
    flag: "/img/flag/ae.webp",
    region: "Middle East",
    popularity: 6,
    rtl: true,
  },
  // Common locale formats
  yue: {
    name: "Cantonese",
    nativeName: "廣東話",
    flag: "/img/flag/hk.webp",
    region: "Asia",
    popularity: 5,
  },
  "yue-HK": {
    name: "Cantonese (Hong Kong)",
    nativeName: "廣東話 (香港)",
    flag: "/img/flag/hk.webp",
    region: "Asia",
    popularity: 5,
  },
  as: {
    name: "Assamese",
    nativeName: "অসমীয়া",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 1,
  },
  or: {
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    flag: "/img/flag/in.webp",
    region: "Asia",
    popularity: 1,
  },
  ps: {
    name: "Pashto",
    nativeName: "پښتو",
    flag: "/img/flag/af.webp",
    region: "Asia",
    popularity: 2,
    rtl: true,
  },
  sd: {
    name: "Sindhi",
    nativeName: "سنڌي",
    flag: "/img/flag/pk.webp",
    region: "Asia",
    popularity: 1,
    rtl: true,
  },
  ug: {
    name: "Uyghur",
    nativeName: "ئۇيغۇرچە",
    flag: "/img/flag/cn.webp",
    region: "Asia",
    popularity: 1,
    rtl: true,
  },
});

// Smart fallback function for unknown locales
const createLanguageFallback = (code: string): Omit<Language, "code"> => {
  // Handle common locale patterns
  const baseCode = code.split("-")[0].toLowerCase();
  const countryCode = code.split("-")[1]?.toLowerCase();

  // Map regions based on common country codes
  const regionMap: Record<string, string> = {
    us: "Americas",
    ca: "Americas",
    mx: "Americas",
    br: "Americas",
    ar: "Americas",
    cl: "Americas",
    pe: "Americas",
    co: "Americas",
    gb: "Europe",
    de: "Europe",
    fr: "Europe",
    it: "Europe",
    es: "Europe",
    pt: "Europe",
    nl: "Europe",
    se: "Europe",
    no: "Europe",
    dk: "Europe",
    cn: "Asia",
    jp: "Asia",
    kr: "Asia",
    in: "Asia",
    th: "Asia",
    vn: "Asia",
    id: "Asia",
    my: "Asia",
    sg: "Asia",
    ph: "Asia",
    eg: "Africa",
    za: "Africa",
    ng: "Africa",
    ke: "Africa",
    ma: "Africa",
    et: "Africa",
    gh: "Africa",
    au: "Oceania",
    nz: "Oceania",
    fj: "Oceania",
    sa: "Middle East",
    ae: "Middle East",
    ir: "Middle East",
    iq: "Middle East",
    il: "Middle East",
    tr: "Middle East",
  };
  const region = countryCode ? regionMap[countryCode] || "Other" : "Other";

  // Create readable name from code
  const name = code
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  // Try to get appropriate flag
  const flagCode = countryCode || baseCode;
  const flag = `/img/flag/${flagCode}.webp`;
  return {
    name,
    nativeName: name,
    flag,
    region,
    popularity: 1,
  };
};
const getLanguageData = (): Language[] => {
  // Handle multi-line environment variable with proper parsing
  const languagesString = process.env.NEXT_PUBLIC_LANGUAGES || "";
  const languages =
    languagesString
      .split(/[,\n\r]+/) // Split by comma, newline, or carriage return
      .map((code) => code.trim()) // Remove whitespace
      .filter((code) => code.length > 0) || // Remove empty strings
    [];

  // Debug logging
  if (typeof window !== "undefined" && languages.length === 0) {
    console.log(
      "Debug: NEXT_PUBLIC_LANGUAGES:",
      process.env.NEXT_PUBLIC_LANGUAGES
    );
    console.log("Debug: languagesString:", languagesString);
    console.log("Debug: parsed languages:", languages);
  }
  const languageMap = createComprehensiveLanguageMap();
  return languages.map((code) => ({
    code,
    ...(languageMap[code] || createLanguageFallback(code)),
  }));
};
interface LanguageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}
const LanguageDrawer: React.FC<LanguageDrawerProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = useLocale();
  const [, startTransition] = React.useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const allLanguages = getLanguageData();
  const defaultLanguage = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en";
  const filteredLanguages = useMemo(() => {
    if (searchQuery === "") {
      return allLanguages.sort((a, b) => b.popularity - a.popularity);
    }
    return allLanguages
      .filter((lang) => {
        return (
          lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allLanguages, searchQuery]);
  const currentLanguage = allLanguages.find((lang) => lang.code === locale);
  const handleLanguageSelect = (langCode: string) => {
    // Set cookie to persist language preference
    document.cookie = `NEXT_LOCALE=${langCode}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    
    startTransition(() => {
      router.replace(pathname, { locale: langCode });
      onClose();
    });
  };
  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="h-screen w-[90vw] max-w-md fixed right-0 top-0">
        <DrawerHeader className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DrawerTitle className="text-xl font-semibold">
                  Choose Language
                </DrawerTitle>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Select your preferred language from {allLanguages.length}{" "}
                  available options
                </p>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex flex-col h-full max-h-[calc(100vh-0px)]">
          {/* Fixed Content Section */}
          <div className="flex-shrink-0 p-4 space-y-4 border-b border-zinc-200 dark:border-zinc-800">
            {/* Current Language */}
            {currentLanguage && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full overflow-hidden">
                    <Image
                      src={currentLanguage.flag}
                      alt=""
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                      Current: {currentLanguage.name}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {currentLanguage.nativeName}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Active
                  </Badge>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search languages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Scrollable Language List */}
          <div className="flex-1 overflow-hidden min-h-0">
            <ScrollArea className="h-full max-h-full">
              <div className="p-4 space-y-1 pb-6">
                <AnimatePresence>
                  {filteredLanguages.map((lang, index) => {
                    return (
                      <motion.button
                        key={lang.code}
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          y: -10,
                        }}
                        transition={{
                          delay: index * 0.01,
                        }}
                        whileHover={{
                          scale: 1.005,
                        }}
                        whileTap={{
                          scale: 0.995,
                        }}
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                          locale === lang.code
                            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={lang.flag}
                            alt=""
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{lang.name}</p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {lang.nativeName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0.5"
                          >
                            {lang.region}
                          </Badge>
                          {lang.code === defaultLanguage && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800"
                            >
                              Default
                            </Badge>
                          )}
                          {locale === lang.code && (
                            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
export default LanguageDrawer;
