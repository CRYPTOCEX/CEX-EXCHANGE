"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Wallet,
  Menu,
  X,
  TrendingUp,
  ShoppingBag,
  Palette,
  ChevronLeft,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { cn } from "@/lib/utils";
import NavbarLogo from "@/components/elements/navbar-logo";
import NotificationBell from "@/components/partials/header/notification-bell";
import LanguageSelector from "@/components/partials/header/language-selector";
import ProfileInfo from "@/components/partials/header/profile-info";
import { $fetch } from "@/lib/api";

export default function NFTNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>({ collections: [], tokens: [], creators: [] });
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useUserStore();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for custom event from hero section to trigger search
  useEffect(() => {
    const handleHeroSearch = (e: CustomEvent) => {
      const query = e.detail?.query || "";
      setSearchQuery(query);
      setIsSearchOpen(true);
    };

    window.addEventListener("nft-hero-search" as any, handleHeroSearch);
    return () => window.removeEventListener("nft-hero-search" as any, handleHeroSearch);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ collections: [], tokens: [], creators: [] });
      return;
    }

    const searchTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Search collections
        const collectionsRes = await $fetch({
          url: `/api/nft/collection`,
          params: { search: searchQuery, limit: 3 },
          silentSuccess: true,
        });

        // Search tokens
        const tokensRes = await $fetch({
          url: `/api/nft/token`,
          params: { search: searchQuery, limit: 3 },
          silentSuccess: true,
        });

        setSearchResults({
          collections: collectionsRes.data?.items || collectionsRes.data?.data || [],
          tokens: tokensRes.data?.data || [],
          creators: [], // Creator search not implemented yet
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  const navItems = [
    { label: "Explore", href: "/nft", icon: TrendingUp },
    { label: "Marketplace", href: "/nft/marketplace", icon: ShoppingBag },
    ...(user ? [{ label: "Creator", href: "/nft/creator", icon: Palette }] : []),
  ];

  return (
    <>
      {/* Main Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-lg"
            : "bg-transparent"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Back Button & Logo */}
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="group hover:bg-primary/10 transition-colors"
                  title="Back to Home"
                >
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <NavbarLogo href="/nft" />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "relative gap-2 transition-all",
                        isActive && "text-primary"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                      {isActive && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-purple-600"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <Button
                variant="ghost"
                size="icon"
                className="relative hidden sm:flex"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="w-5 h-5" />
                <kbd className="absolute -bottom-1 -right-1 text-[10px] bg-muted px-1 rounded">
                  ⌘K
                </kbd>
              </Button>

              {/* Language Selector */}
              <LanguageSelector variant="compact" />

              {/* Notifications */}
              {user && <NotificationBell />}

              {/* User Menu or Connect Wallet */}
              {user ? (
                <ProfileInfo />
              ) : (
                <Button className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90">
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                </Button>
              )}

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 z-40 md:hidden bg-background pt-20"
          >
            <div className="container px-4 py-6 space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-lg h-14"
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
            >
              <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[600px] flex flex-col">
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search NFTs, collections, creators..."
                      className="pl-10 pr-4 h-12 text-lg border-0 focus-visible:ring-0"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="mt-2">Searching...</p>
                    </div>
                  ) : searchQuery.trim() ? (
                    <>
                      {/* Collections Results */}
                      {searchResults.collections.length > 0 && (
                        <div className="p-4 border-b border-border">
                          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Collections</h3>
                          {searchResults.collections.map((collection: any) => (
                            <Link
                              key={collection.id}
                              href={`/nft/collection/${collection.id}`}
                              onClick={() => setIsSearchOpen(false)}
                            >
                              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                                <img
                                  src={collection.logoImage || "/img/placeholder.svg"}
                                  alt={collection.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{collection.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{collection.description}</p>
                                </div>
                                {collection.isVerified && (
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Tokens Results */}
                      {searchResults.tokens.length > 0 && (
                        <div className="p-4 border-b border-border">
                          <h3 className="text-sm font-semibold text-muted-foreground mb-3">NFTs</h3>
                          {searchResults.tokens.map((token: any) => (
                            <Link
                              key={token.id}
                              href={`/nft/token/${token.id}`}
                              onClick={() => setIsSearchOpen(false)}
                            >
                              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                                <img
                                  src={token.image || "/img/placeholder.svg"}
                                  alt={token.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{token.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {token.collection?.name} #{token.tokenId}
                                  </p>
                                </div>
                                {token.currentListing && (
                                  <Badge variant="secondary" className="text-xs">
                                    {token.currentListing.price} {token.currentListing.currency}
                                  </Badge>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Creators Results */}
                      {searchResults.creators.length > 0 && (
                        <div className="p-4">
                          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Creators</h3>
                          {searchResults.creators.map((creator: any) => (
                            <Link
                              key={creator.id}
                              href={`/nft/creator/${creator.id}`}
                              onClick={() => setIsSearchOpen(false)}
                            >
                              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{creator.displayName || creator.user?.firstName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{creator.bio}</p>
                                </div>
                                {creator.isVerified && (
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* No Results */}
                      {searchResults.collections.length === 0 &&
                       searchResults.tokens.length === 0 &&
                       searchResults.creators.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                          <p>No results found for "{searchQuery}"</p>
                          <p className="text-sm mt-2">Try different keywords</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      <p>Try searching for "Crypto Punks", "Bored Apes", or "Art"</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
