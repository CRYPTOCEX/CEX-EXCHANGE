"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function AffiliateRedirectPage() {
  const t = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  useEffect(() => {
    if (code) {
      // Store the affiliate code in sessionStorage
      sessionStorage.setItem("affiliateRef", code);
      
      /* THIS USED TO PUSH `/?auth=false&view=register`, AND EVERY REFERRAL
         CLICK LANDED ON A FULL-SCREEN REFUSAL.

         `components/auth/global-auth-detector.tsx:47-55` reads `auth=false`
         with no user — which is every logged-out visitor, i.e. exactly the
         audience a referral link is for — and paints `<UnauthorizedAccess/>`
         over the whole viewport. The `view=register` half was consumed by
         nothing: the only reader of `?view` in the app is the blog.

         `/register?ref=` is the shape the affiliate generator has always
         produced (referral-generator/client.tsx:49) and the register page
         already stores the code and opens the modal on it
         (register/page.tsx:16-19). The sessionStorage write above stays as the
         fallback for a visitor who browses first and registers later. */
      router.push(`/register?ref=${encodeURIComponent(code)}`);
    }
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t("redirecting")}…</p>
      </div>
    </div>
  );
}