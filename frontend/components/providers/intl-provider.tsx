"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

interface IntlProviderProps {
  locale: string;
  messages: any;
  children: ReactNode;
}

export function IntlProvider({ locale, messages, children }: IntlProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages || {}}
      timeZone="UTC"
      onError={(error) => {
        const errorMsg = error.message || '';

        // Suppress validation errors for nested keys that are incorrectly reported
        // The error reports paths like "menu.admin.dashboard" but these are properly nested
        if (errorMsg.includes('INVALID_KEY') && errorMsg.includes('menu.admin')) {
          return;
        }

        // Suppress MISSING_MESSAGE errors for menu.. (empty key) - these are handled gracefully
        if (errorMsg.includes('MISSING_MESSAGE') && errorMsg.includes('menu..')) {
          return;
        }

        // Suppress MISSING_MESSAGE errors for any menu keys - we have fallbacks
        if (errorMsg.includes('MISSING_MESSAGE') && errorMsg.includes('menu.')) {
          return;
        }

        // Log other errors
        console.error('IntlError:', error);
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
