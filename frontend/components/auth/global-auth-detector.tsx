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
            // User is authenticated but doesn't have admin permissions
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
        />
      </div>
    );
  }

  return null;
} 