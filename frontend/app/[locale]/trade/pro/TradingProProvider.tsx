"use client";

import React, { ReactNode } from "react";
import { ExtensionStatusProvider } from "./providers/ExtensionStatusProvider";
import { SettingsProvider } from "./providers/SettingsProvider";
import { LayoutProvider } from "./providers/LayoutProvider";
import { HotkeysProvider } from "./providers/HotkeysProvider";

interface TradingProProviderProps {
  children: ReactNode;
}

export function TradingProProvider({ children }: TradingProProviderProps) {
  return (
    <ExtensionStatusProvider>
      <SettingsProvider>
        <LayoutProvider>
          <HotkeysProvider>{children}</HotkeysProvider>
        </LayoutProvider>
      </SettingsProvider>
    </ExtensionStatusProvider>
  );
}
