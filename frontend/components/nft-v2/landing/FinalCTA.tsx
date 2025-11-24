"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  Send,
  CheckCircle2,
  Rocket,
  Palette,
  Globe,
  Shield,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

export default function FinalCTA() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    // Simulate subscription
    setIsSubscribed(true);
    toast.success("Successfully subscribed to newsletter!");
    setEmail("");
  };

  const benefits = [
    {
      icon: Sparkles,
      title: "Zero Fees",
      description: "No listing fees for the first 30 days",
    },
    {
      icon: Shield,
      title: "Verified NFTs",
      description: "All collections verified and secure",
    },
    {
      icon: TrendingUp,
      title: "Best Prices",
      description: "Competitive pricing across all chains",
    },
    {
      icon: Globe,
      title: "Multi-Chain",
      description: "Trade on 10+ blockchains",
    },
  ];

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-600/5 to-pink-600/5">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background:
              "radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main CTA Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-1 shadow-2xl"
        >
          <div className="bg-background rounded-3xl p-8 md:p-12">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-full mb-6"
              >
                <Rocket className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  Join 100,000+ Creators & Collectors
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
              >
                <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Start Your NFT Journey
                </span>
                <br />
                Today
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
              >
                Create, buy, and sell NFTs on the world's leading multi-chain
                marketplace. Zero upfront costs, instant transactions, and
                global reach.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap justify-center gap-4 mb-12"
              >
                <Link href="/nft/create">
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg text-lg px-8"
                  >
                    <Palette className="w-5 h-5" />
                    Create Your First NFT
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/nft/marketplace">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 shadow-lg text-lg px-8"
                  >
                    <TrendingUp className="w-5 h-5" />
                    Explore Marketplace
                  </Button>
                </Link>
              </motion.div>

              {/* Newsletter */}
              {!isSubscribed ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="max-w-md mx-auto"
                >
                  <p className="text-sm text-muted-foreground mb-3">
                    Get exclusive drops and updates
                  </p>
                  <form
                    onSubmit={handleSubscribe}
                    className="flex gap-2 bg-muted/50 p-2 rounded-2xl"
                  >
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-0 bg-transparent focus-visible:ring-0"
                    />
                    <Button type="submit" className="gap-2 shrink-0">
                      Subscribe
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  <p className="text-xs text-muted-foreground mt-2">
                    Join 50,000+ subscribers. No spam, unsubscribe anytime.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 text-green-500"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">
                    Thanks for subscribing! Check your inbox.
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12"
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{benefit.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center mt-12"
        >
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>1M+ NFTs Listed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>$500M+ Trading Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>100K+ Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>10+ Blockchains</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
