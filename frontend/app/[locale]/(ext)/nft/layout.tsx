"use client";

import NFTNavbar from "@/components/nft/navigation/NFTNavbar";

export default function NFTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Custom NFT Navigation - No top navbar */}
      <NFTNavbar />

      {/* Main content without padding since navbar is floating */}
      <main className="flex-1">{children}</main>

      {/* Custom NFT Footer - Minimal and focused */}
      <footer className="border-t border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2025 NFT Market. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/terms" className="hover:text-foreground transition">Terms</a>
              <a href="/privacy" className="hover:text-foreground transition">Privacy</a>
              <a href="/support" className="hover:text-foreground transition">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 