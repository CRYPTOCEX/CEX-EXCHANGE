"use client";

import { create } from "zustand";

interface LogoCacheStore {
  logoVersion: number;
  logoTimestamp: number;
  updateLogoVersion: () => void;
}

export const useLogoCacheStore = create<LogoCacheStore>((set) => ({
  logoVersion: 1,
  logoTimestamp: Date.now(),
  updateLogoVersion: () => set(() => ({ 
    logoVersion: Date.now(), // Use timestamp for more aggressive cache busting
    logoTimestamp: Date.now()
  })),
})); 