"use client";

/**
 * The Obsidian landing kit.
 *
 * Phase 8a rebuilt the core landing page on these primitives but left them
 * private to `app/[locale]/home.tsx`, so every addon page kept rendering the
 * old page-builder composition (HeroSection + TrustBar + FeaturesSection +
 * ProcessSection + CTASection, over InteractivePattern, FloatingShapes and four
 * blurred orbs). Recolouring those to `primary` made them one hue; it did not
 * make them this design. They looked the same because they *were* the same.
 *
 * So the primitives live here now and the pages — core and addon alike —
 * compose them. The rules they encode (DESIGN-SYSTEM.md):
 *
 *   R2  the accent marks what is interactive or the one figure that matters;
 *       everything else is the surface ramp and the ink scale
 *   R3  elevation is `background -> card -> surface-2 -> surface-3` plus a
 *       hairline, never a gradient and never a shadow standing in for one
 *   R5  `up`/`down` are reserved for direction of money. A green chip that
 *       means "feature" is a bug, not a decoration
 */

import React, { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------

/**
 * Fixed page ground. One hue, and it reads as a light source rather than as
 * paint: two stops of the brand colour high on the page, plus the same hairline
 * grid every panel edge uses, faded out with a radial mask so it never becomes
 * a texture in its own right.
 */
export function PageBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background" aria-hidden="true">
      <div className="absolute -top-1/3 left-1/2 h-[70vh] w-[120vw] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
      <div className="absolute bottom-0 left-1/4 h-[40vh] w-[60vw] rounded-full bg-primary/5 blur-[120px]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 75%)",
        }}
      />
    </div>
  );
}

/** Film grain. Colourless, so it survives both themes untouched. */
export function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

/** Ground + grain, for pages that want the whole treatment in one tag. */
export function LandingShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex flex-col overflow-hidden", className)}>
      <PageBackground />
      <NoiseOverlay />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

/** One step up the ramp, one hairline, no gradient. */
export function Panel({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card",
        hover && "transition-colors duration-200 hover:border-border-strong",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Section eyebrow — the recurring accent mark that ties a page together.
 *
 * The ground is an opaque ramp step rather than an accent tint, and that is a
 * contrast decision, not a style one. Accent ink on a 10% accent wash measured
 * **3.35:1 in light mode** — this is 12px semibold, so it needs 4.5:1, and it
 * appears on every landing page. Worse, an alpha tint composites onto whatever
 * sits behind it, so the same eyebrow measured differently inside a panel than
 * on the page ground; an opaque step is deterministic wherever it lands.
 *
 * `--card` specifically, not `--surface-2`: this is a raised chip and `card` is
 * the raised rung. (It was `surface-2` briefly, which passed only because
 * `--surface-2` was then byte-identical to `--card` in light mode — a dead rung
 * that has since been given its own value, taking the eyebrow to 4.38:1.)
 *
 * Measured against the live stylesheet: 4.55:1 light, 6.01:1 dark. The accent
 * survives in the border and the icon, which is where R2 wants it anyway.
 */
export function Eyebrow({
  icon: Icon,
  children,
  className,
}: {
  icon?: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card",
        "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary",
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/**
 * Small "streaming" affordance. `up` is correct here and only here: it reports
 * that a live feed is healthy, which is the one non-P&L reading R5 allows.
 */
export function LivePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-up/20 bg-up/10 px-2.5 py-1">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-up">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Calls to action
// ---------------------------------------------------------------------------

export function PrimaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6",
        "bg-primary font-semibold text-primary-foreground",
        "transition-colors hover:bg-primary/90",
        className
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6",
        "border border-border bg-surface-2 font-semibold text-foreground",
        "transition-colors hover:border-border-strong hover:bg-surface-3",
        className
      )}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section shell
// ---------------------------------------------------------------------------

/** Reveal on scroll. Transform and opacity only — never colour. */
export function useSectionReveal(ref: React.RefObject<HTMLElement | null>) {
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setIsVisible(true)),
      { threshold: 0.08, rootMargin: "80px 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  if (prefersReducedMotion) return { opacity: 1, y: 0 };
  return { opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 24 };
}

export function Section({
  children,
  className,
  id,
  bordered = false,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bordered?: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { opacity, y } = useSectionReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={cn("relative overflow-hidden py-20 lg:py-28", bordered && "border-t border-border", className)}
    >
      <m.div
        animate={{ opacity, y }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="container relative z-10 mx-auto px-4 will-change-transform md:px-6"
      >
        {children}
      </m.div>
    </section>
  );
}

/**
 * Render a headline with one accented run.
 *
 * Every existing landing page passes its highlight as a *substring* of the
 * title (`title: "Ready to Maximize Your Returns"`, `titleHighlight: "Returns"`)
 * because that is what the old page-builder sections expected — they searched
 * for it. Appending it instead would print the word twice, and the copy comes
 * from translation files where a caller cannot simply split it themselves. So:
 * highlight in place when it occurs, append when it does not.
 */
export function Headline({ title, highlight }: { title: string; highlight?: string }) {
  if (!highlight) return <>{title}</>;
  const at = title.toLowerCase().lastIndexOf(highlight.toLowerCase());
  if (at === -1) {
    return (
      <>
        {title} <span className="text-primary">{highlight}</span>
      </>
    );
  }
  return (
    <>
      {title.slice(0, at)}
      <span className="text-primary">{title.slice(at, at + highlight.length)}</span>
      {title.slice(at + highlight.length)}
    </>
  );
}

/** Centred section header. `highlight` is the only accent-coloured run of text. */
export function SectionHeading({
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string;
  eyebrowIcon?: any;
  title: string;
  highlight?: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("mb-14", align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "text-balance text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl",
          eyebrow ? "mt-6" : ""
        )}
      >
        <Headline title={title} highlight={highlight} />
      </h2>
      {subtitle && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
