"use client";

import { Link } from "@/i18n/routing";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight, PenLine, Zap, Star } from "lucide-react";

export function CTASection() {
  const t = useTranslations("blog_blog");
  const { user } = useUserStore();

  if (!user) return null;

  return (
    <section className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-primary" />

      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Its three siblings are real hues (destructive/primary); this one was
            the odd `--card`, which is a SURFACE token and therefore flips from
            a white bloom in light mode to a black smudge in dark. On a band the
            light bloom is `--overlay-foreground`. */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-overlay-foreground/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-destructive/20 rounded-full blur-3xl animate-pulse animate-delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-pulse animate-delay-500" />
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse animate-delay-700" />
      </div>

      {/* Grid pattern. The section ground is the primary -> destructive slab
          above, so this rule is white-on-band in both themes. */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--overlay-foreground)/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--overlay-foreground)/0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Content */}
      <div className="relative z-10 px-4 py-20 text-center max-w-5xl mx-auto">
        {/* Floating badge */}
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-overlay-foreground/10 backdrop-blur-sm border border-overlay-foreground/20 text-overlay-foreground mb-8"
        >
          <Sparkles className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium">{t("join_our_community")}</span>
        </m.div>

        {/* Headline */}
        <m.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          // The clipped gradient here was `from-card via-primary to-card` — on
          // a section whose ground is the primary -> destructive slab. So the
          // middle third of the headline was primary-on-primary and vanished,
          // in BOTH themes, while the ends tracked `--card` (white in light,
          // near-black in dark) and so changed contrast per theme. On-band ink
          // is `--overlay-foreground`, which is what the badge and grid rule
          // above already use.
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-overlay-foreground mb-8"
        >
          {t("ready_to_share_your_knowledge")}
        </m.h2>

        {/* Description */}
        <m.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto max-w-2xl text-xl sm:text-2xl text-overlay-foreground/80 mb-12"
        >
          {t("join_our_community_growing_audience")}
        </m.p>

        {/* Features row */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-8 mb-12"
        >
          {[
            { icon: PenLine, text: "Write articles" },
            { icon: Zap, text: "Reach readers" },
            { icon: Star, text: "Build reputation" },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-overlay-foreground/90"
            >
              <div className="w-10 h-10 rounded-full bg-card/10 backdrop-blur-sm flex items-center justify-center border border-overlay-foreground/20">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-lg">{item.text}</span>
            </div>
          ))}
        </m.div>

        {/* CTA Button */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/blog/author/apply">
            <Button
              size="lg"
              className="rounded-full bg-card text-primary hover:bg-card/90 shadow-2xl hover:shadow-overlay-foreground/25 transition-all duration-300 text-lg px-10 py-7 h-auto font-semibold"
            >
              {t("apply_to_be_an_author")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </m.div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-24 h-24 border border-overlay-foreground/10 rounded-full opacity-50" />
        <div className="absolute bottom-20 right-10 w-40 h-40 border border-overlay-foreground/10 rounded-full opacity-50" />
        <div className="absolute top-1/3 right-20 w-3 h-3 bg-warning rounded-full opacity-75 animate-pulse" />
        <div className="absolute bottom-1/3 left-16 w-2 h-2 bg-destructive rounded-full opacity-75 animate-pulse animate-delay-500" />
        <div className="absolute top-1/2 left-10 w-4 h-4 bg-card/30 rounded-full opacity-50 animate-pulse animate-delay-300" />
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-primary rounded-full opacity-75 animate-pulse animate-delay-700" />
      </div>
    </section>
  );
}
