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
    >
      {children}
    </NextIntlClientProvider>
  );
}
