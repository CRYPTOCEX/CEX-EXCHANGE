"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { AuthModal } from "@/components/auth/auth-modal";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const ref = searchParams.get("ref");

  // Store the ref parameter in sessionStorage when the page loads
  useEffect(() => {
    if (ref) {
      sessionStorage.setItem("affiliateRef", ref);
    }
  }, [ref]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Redirect to home page when modal is closed
    router.push("/");
  };

  const handleViewChange = (view: string) => {
    // If user switches to login, keep them on the page
    if (view === "login") {
      // You can handle this if needed
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AuthModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        initialView="register"
        onViewChange={handleViewChange}
        returnTo="/"
      />
      
      {/* Background content */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
      </div>
    </div>
  );
}