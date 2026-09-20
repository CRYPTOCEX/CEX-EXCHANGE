"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/user";
import { UnauthorizedAccess } from "./unauthorized-access";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";
import { cleanupAuthFalseParam } from "@/utils/url-cleanup";

/**
 * Global authentication detector that shows unauthorized access page when auth=false is detected
 * This component should be placed in the root layout to work across all pages
 */
export function GlobalAuthDetector() {
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  /*
   * WHICH refusal this is. `?auth=false` covers two very different states and
   * used to render the same words for both:
   *
   *     Access Restricted
   *     You Need To Be Authenticated To Access This Area
   *
   * For a signed-in admin whose ROLE simply holds no admin permissions, every
   * sentence there is false — they are authenticated, and signing in again (the
   * only action the page offers) cannot possibly help. It reads as a broken
   * login, so the reasonable next move is to delete the account and make
   * another one, which is how a permissions problem turns into a signup
   * rate-limit lockout with the original cause never named.
   *
   * The distinguishing fact is already in hand: `user` is non-null.
   */
  const [refusal, setRefusal] = useState<"unauthenticated" | "unpermitted">(
    "unauthenticated"
  );
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const hasPermission = useUserStore((state) => state.hasPermission);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const authParam = searchParams?.get("auth");
    
    // Don't do anything while user data is still loading
    if (isLoading) {
      return;
    }
    
    if (authParam === "false") {
      if (!user) {
        // User is not authenticated, show unauthorized page
        setRefusal("unauthenticated");
        setShowUnauthorized(true);
      } else {
        // User is authenticated, check if this is an admin route
        const strippedPath = pathname.replace(/^\/[a-z]{2}\//, '/'); // Remove locale
        
        if (strippedPath.startsWith('/admin')) {
          // Check if user has admin permissions
          const hasAdminAccess = user.role?.name === "Super Admin" || hasPermission("access.admin");
          
          if (hasAdminAccess) {
            // User has admin access, clean up the auth parameter
            cleanupAuthFalseParam();
            setShowUnauthorized(false);
          } else {
            // Signed in, but the ROLE holds no admin permission. Say that.
            setRefusal("unpermitted");
            setShowUnauthorized(true);
          }
        } else {
          // Not an admin route, clean up the auth parameter
          cleanupAuthFalseParam();
          setShowUnauthorized(false);
        }
      }
    } else {
      // No auth=false parameter, hide unauthorized page
      setShowUnauthorized(false);
    }
  }, [user, isLoading, searchParams, pathname, router, hasPermission]);

  // Show unauthorized access page as an overlay
  if (showUnauthorized) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <UnauthorizedAccess
          returnPath={pathname}
          reason={refusal}
          roleName={user?.role?.name}
        />
      </div>
    );
  }

  return null;
} 