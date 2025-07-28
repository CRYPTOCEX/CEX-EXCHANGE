// Type augmentation for next-intl 4.0
import { formats } from '@/i18n/request';
import { routing } from '@/i18n/routing';
import en from './messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof en;
    Formats: typeof formats;
    Locale: (typeof routing.locales)[number];
}
}

// SVG module declarations
declare module "*.svg" {
  import * as React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

// Global types
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
  
  type IntlMessages = typeof en;
}

export {};
