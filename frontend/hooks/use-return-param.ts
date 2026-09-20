// hooks/use-return-param.ts
"use client";
import { useEffect, useState } from "react";

export function useReturnParam() {
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    // On mount (client-side only), get the 'return' param
    const params = new URLSearchParams(window.location.search);
    const ret = params.get("return");
    if (ret) setReturnTo(ret);
  }, []);

  return returnTo;
}
