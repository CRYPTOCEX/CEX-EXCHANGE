"use client";

/**
 * Design-system kitchen sink.
 *
 * Every primitive, every variant, every state, on one page in both themes.
 * This is the visual regression harness for the DESIGN-SYSTEM.md migration —
 * Phases 3-8 each end with "kitchen sink unchanged".
 *
 * Route: /en/design-system
 *
 * NOT named `_kitchen-sink`: a leading underscore marks a PRIVATE FOLDER in the
 * App Router, which is excluded from routing entirely — the page would 404.
 * Nav in this app is declared explicitly in menu.ts, so a plain route stays out
 * of the menus anyway.
 *
 * Rules it exists to enforce:
 *   R1  price direction (up/down) is the loudest colour; brand accent sits far from both
 *   R2  the accent means "interactive"; status colours mean state and ship with a label
 *   R3  elevation is the surface ramp, never a gradient
 *   R4  numbers are monospaced and tabular in columns
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tag } from "@/components/ui/tag";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Loader } from "@/components/ui/loader";
import { useTheme } from "next-themes";

/* ------------------------------------------------------------------ */

function Section({
  title,
  rule,
  children,
}: {
  title: string;
  rule?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3 border-b border-border pb-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {rule ? (
          <span className="font-mono text-[10px] uppercase tracking-widest text-subtle-foreground">
            {rule}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/** Swatch that also proves the token emits CSS at all. */
function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="w-28 space-y-1">
      <div className={`h-12 rounded border border-border ${className}`} />
      <div className="font-mono text-[10px] text-subtle-foreground">{name}</div>
    </div>
  );
}

const MOTION_PRESETS = [
  { label: "Snappy", scale: "0.5" },
  { label: "Default", scale: "1" },
  { label: "Relaxed", scale: "1.5" },
  { label: "Off", scale: "0.01" },
];

/**
 * The motion axis, made visible.
 *
 * `--motion-scale` multiplies every `duration-*` / `delay-*` utility, so one
 * number retimes the whole platform. This is the working reference for what the
 * admin design panel will write — it sets the same custom property on the same
 * element, and nothing else.
 *
 * The bars below carry ordinary utility classes (`duration-150`, `duration-300`
 * …) with nothing motion-aware about them. That is the point: they move because
 * the token moved, not because this page told them to.
 */
function MotionLab() {
  const [scale, setScale] = React.useState("1");
  const [shifted, setShifted] = React.useState(false);
  const [systemReduced, setSystemReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystemReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    // Never override a stated accessibility preference, not even in a lab.
    if (systemReduced) return;
    const root = document.documentElement;
    root.style.setProperty("--motion-scale", scale);
    // Braces, not a concise body: `removeProperty` returns the old value, and an
    // effect cleanup that returns a string is not a valid Destructor.
    return () => {
      root.style.removeProperty("--motion-scale");
    };
  }, [scale, systemReduced]);

  return (
    <div className="space-y-4">
      <Row>
        {MOTION_PRESETS.map((p) => (
          <Button
            key={p.label}
            size="sm"
            variant={scale === p.scale ? "default" : "outline"}
            disabled={systemReduced}
            onClick={() => setScale(p.scale)}
          >
            {p.label}
            <span className="ml-1.5 font-mono text-[10px] opacity-60">
              {p.scale}
            </span>
          </Button>
        ))}
        <Separator orientation="vertical" className="h-6" />
        <Button size="sm" variant="secondary" onClick={() => setShifted((v) => !v)}>
          Play
        </Button>
      </Row>

      {systemReduced ? (
        <p className="text-xs text-muted-foreground">
          Your system asks for reduced motion, so the page has already collapsed
          the scale to <code className="font-mono">0.01</code> and these controls
          are disabled. That is the feature working, not a bug.
        </p>
      ) : null}

      <div className="space-y-2">
        {[
          { d: "duration-150", cls: "duration-150" },
          { d: "duration-300", cls: "duration-300" },
          { d: "duration-500", cls: "duration-500" },
          { d: "duration-1000", cls: "duration-1000" },
        ].map((b) => (
          <div key={b.d} className="flex items-center gap-3">
            <span className="w-28 shrink-0 font-mono text-[10px] text-subtle-foreground">
              {b.d}
            </span>
            <div className="h-6 flex-1 rounded border border-border bg-muted/40">
              <div
                className={`h-full w-16 rounded bg-primary transition-transform ease-in-out ${b.cls} ${
                  shifted ? "translate-x-[calc(100%*3)]" : "translate-x-0"
                }`}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Tailwind ships no <code className="font-mono">--duration-*</code> theme
        namespace, so <code className="font-mono">duration-300</code> compiles to
        a literal an admin panel could never reach. Overriding the functional
        utility is the hook —{" "}
        <code className="font-mono">--motion-scale</code> is the single number
        behind all 792 call sites, and easing routes through{" "}
        <code className="font-mono">--motion-ease</code>,{" "}
        <code className="font-mono">--motion-ease-in</code> and{" "}
        <code className="font-mono">--motion-ease-out</code>.
      </p>
    </div>
  );
}

export default function KitchenSinkPage() {
  const { theme, setTheme } = useTheme();
  const [checked, setChecked] = React.useState(true);

  /**
   * next-themes resolves the theme only on the client, so rendering its value
   * during SSR mismatches and throws "Hydration failed". Gate the label on a
   * mounted flag and render a stable placeholder on the server.
   */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-5xl space-y-10 p-8">
          <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Design system — kitchen sink
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Obsidian tokens. Flip the theme and nothing should change identity.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              Theme: {mounted ? (theme ?? "system") : "…"}
            </Button>
          </header>

          <Section title="Surface ramp" rule="R3 — elevation, not gradients">
            <Row>
              <Swatch name="background" className="bg-background" />
              <Swatch name="card" className="bg-card" />
              <Swatch name="surface-2" className="bg-surface-2" />
              <Swatch name="surface-3" className="bg-surface-3" />
              <Swatch name="muted" className="bg-muted" />
              <Swatch name="border" className="bg-border" />
              <Swatch name="border-strong" className="bg-border-strong" />
            </Row>
            <div className="rounded border border-border bg-card p-4">
              <div className="rounded border border-border bg-surface-2 p-4">
                <div className="rounded border border-border bg-surface-3 p-4 text-sm">
                  Three nested surfaces — each step must be visible without a gradient.
                </div>
              </div>
            </div>
          </Section>

          <Section title="Brand & status" rule="R2 — accent ≠ state">
            <Row>
              <Swatch name="primary" className="bg-primary" />
              <Swatch name="success" className="bg-success" />
              <Swatch name="warning" className="bg-warning" />
              <Swatch name="destructive" className="bg-destructive" />
              <Swatch name="info" className="bg-info" />
            </Row>
            {/*
              primary and info were the same azure until Phase 4, which made a
              static notice indistinguishable from a button. They are now separate
              hues, validated for CVD separation. This pair sits side by side so
              the distinction stays visible and cannot quietly regress.
            */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded border border-info/30 bg-info/10 p-3">
                <div className="flex items-start gap-2 text-sm text-info">
                  <span aria-hidden>ⓘ</span>
                  <span>Info — a state you read. Never a control.</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded border border-border bg-card p-3">
                <Button size="sm">Accent — a thing you click</Button>
                <span className="text-xs text-subtle-foreground">R2</span>
              </div>
            </div>
          </Section>

          <Section title="Price direction" rule="R1 — loudest colour on screen">
            <Row>
              <Swatch name="up" className="bg-up" />
              <Swatch name="down" className="bg-down" />
            </Row>
            <div className="rounded border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-subtle-foreground">
                      Pair
                    </th>
                    <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-subtle-foreground">
                      Last
                    </th>
                    <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-subtle-foreground">
                      24h
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {[
                    ["BTC/USDT", "68,432.10", "+2.41%", true],
                    ["ETH/USDT", "3,486.22", "+1.08%", true],
                    ["SOL/USDT", "184.07", "-3.62%", false],
                    ["XAU/USD", "2,412.85", "+0.34%", true],
                  ].map(([sym, last, chg, isUp]) => (
                    <tr key={sym as string} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 font-sans font-medium">{sym}</td>
                      <td className="px-3 py-1.5 text-right">{last}</td>
                      <td
                        className={`px-3 py-1.5 text-right ${isUp ? "text-up" : "text-down"}`}
                      >
                        {chg}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              R4: prices are monospaced and tabular so they align on the decimal.
            </p>
          </Section>

          <Section title="Chart ramp" rule="validated: CVD + contrast, both themes">
            <Row>
              {/* Written out, NOT `bg-chart-${n}`. Tailwind v4 has no config to
                  safelist against, so a constructed class name emits no CSS at
                  all and the swatch would silently render transparent. */}
              <Swatch name="chart-1" className="bg-chart-1" />
              <Swatch name="chart-2" className="bg-chart-2" />
              <Swatch name="chart-3" className="bg-chart-3" />
              <Swatch name="chart-4" className="bg-chart-4" />
              <Swatch name="chart-5" className="bg-chart-5" />
              <Swatch name="chart-6" className="bg-chart-6" />
            </Row>
          </Section>

          <Section title="Buttons">
            <Row>
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </Row>
            <Row>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
              <Button>
                <Loader className="mr-2 h-4 w-4" />
                Loading
              </Button>
            </Row>
          </Section>

          <Section title="Badges & tags" rule="R2 — colour + label, never colour alone">
            <Row>
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </Row>
            <Row>
              <Tag variant="info">Info</Tag>
              <Tag variant="success">Success</Tag>
              <Tag variant="warning">Warning</Tag>
              <Tag variant="destructive">Failed</Tag>
              <Tag>Default</Tag>
            </Row>
          </Section>


          <Section title="Tone x appearance" rule="Phase 11 — one axis, every control">
            <p className="text-sm text-muted-foreground">
              The tonal recipe (fill /10, rule /20) is the measured majority of
              ~940 hand-rolled chips. Ink is the derived <code>{"--{tone}-ink"}</code>,
              because the raw token fails AA on its own tint.
            </p>
            {(["solid", "soft", "outline", "ghost"] as const).map((ap) => (
              <Row key={ap}>
                <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">{ap}</span>
                <Badge tone="primary" appearance={ap}>Primary</Badge>
                <Badge tone="success" appearance={ap}>Success</Badge>
                <Badge tone="warning" appearance={ap}>Warning</Badge>
                <Badge tone="destructive" appearance={ap}>Destructive</Badge>
                <Badge tone="info" appearance={ap}>Info</Badge>
                <Badge tone="neutral" appearance={ap}>Neutral</Badge>
              </Row>
            ))}
            <Row>
              <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">sizes</span>
              <Badge tone="success" size="xs">xs</Badge>
              <Badge tone="success" size="sm">sm</Badge>
              <Badge tone="success" size="md">md</Badge>
              <Badge tone="success" size="lg">lg</Badge>
            </Row>
            <Row>
              <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">buttons</span>
              <Button tone="success" size="sm">Solid</Button>
              <Button tone="warning" variant="soft" size="sm">Soft</Button>
              <Button tone="destructive" variant="outline" size="sm">Outline</Button>
              <Button tone="info" variant="ghost" size="sm">Ghost</Button>
              {/* Spinner, not Loader: `Loader` is locked to `text-primary`, so on a
                  primary fill it is primary-on-primary and vanishes. Spinner
                  inherits currentColor and is therefore correct anywhere. */}
              <Button tone="primary" size="sm" iconOnly aria-label="Refresh">
                <Spinner size="sm" label={null} />
              </Button>
            </Row>
          </Section>

          <Section title="Status pills" rule="one STATUS_TONE map, not 239 mappers">
            <Row>
              <StatusBadge status="ACTIVE" />
              <StatusBadge status="PENDING" />
              <StatusBadge status="PROCESSING" />
              <StatusBadge status="COMPLETED" />
              <StatusBadge status="CANCELLED" />
              <StatusBadge status="REJECTED" />
              <StatusBadge status="DRAFT" />
              <StatusBadge status="EXPIRED" />
            </Row>
            <Row>
              <span className="font-mono text-[11px] text-muted-foreground">normalised + unknown:</span>
              <StatusBadge status="in_progress" />
              <StatusBadge status="Canceled" />
              <StatusBadge status="SOME_NEW_ENUM" />
            </Row>
          </Section>

          <Section title="Alerts" rule="tonal by default — solid variants stay for back-compat">
            <div className="grid gap-3">
              <Alert tone="info">
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>A state you read, not a control.</AlertDescription>
              </Alert>
              <Alert tone="destructive">
                <AlertTitle>Something failed</AlertTitle>
                <AlertDescription>Ink is the derived tone, legible on its own tint.</AlertDescription>
              </Alert>
            </div>
          </Section>

          <Section title="Loading & empty">
            <Row>
              <Spinner size="xs" />
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <span className="text-sm text-muted-foreground">inherits currentColor</span>
            </Row>
            <EmptyState
              surface="muted"
              size="sm"
              title="No results"
              description="One empty state, not 56 treatments."
            />
          </Section>

          <Section title="Form controls">
            <div className="grid max-w-xl gap-4">
              <Input title="Amount" placeholder="0.00" />
              <Input
                title="With error"
                placeholder="0.00"
                error
                errorMessage="Insufficient balance"
              />
              <Textarea title="Note" placeholder="Optional note…" />
              <Row>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => setChecked(Boolean(v))}
                  />
                  Checkbox
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch />
                  Switch
                </label>
              </Row>
              <Progress value={62} />
            </div>
          </Section>

          <Section title="Cards, tabs, feedback">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Card</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  A card must be visible against the page ground on elevation alone.
                </CardContent>
              </Card>

              <Tabs defaultValue="one">
                <TabsList>
                  <TabsTrigger value="one">Overview</TabsTrigger>
                  <TabsTrigger value="two">Orders</TabsTrigger>
                  <TabsTrigger value="three">History</TabsTrigger>
                </TabsList>
                <TabsContent value="one" className="pt-3 text-sm text-muted-foreground">
                  Active tab is marked with the brand accent.
                </TabsContent>
                <TabsContent value="two" className="pt-3 text-sm text-muted-foreground">
                  Orders.
                </TabsContent>
                <TabsContent value="three" className="pt-3 text-sm text-muted-foreground">
                  History.
                </TabsContent>
              </Tabs>
            </div>

            <ErrorDisplay error="HTTP 500: settings failed to load" onRetry={() => {}} />

            <Row>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover for tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>Uses the popover token</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-6" />
              <Skeleton className="h-8 w-32" />
            </Row>
          </Section>

          <Section title="Typography">
            <div className="space-y-1">
              <p className="text-foreground">foreground — primary ink</p>
              <p className="text-muted-foreground">muted-foreground — secondary ink</p>
              <p className="text-subtle-foreground">
                subtle-foreground — labels and axis ticks (must clear 4.5:1)
              </p>
              <p className="font-mono tabular-nums text-foreground">
                1,234,567.89 — mono, tabular
              </p>
            </div>
          </Section>

          <Section title="Motion" rule="--motion-scale · --motion-ease*">
            <MotionLab />
          </Section>

          <footer className="border-t border-border pt-4 font-mono text-[10px] uppercase tracking-widest text-subtle-foreground">
            plans/DESIGN-SYSTEM.md · run `pnpm design:debt` for migration progress
          </footer>
        </div>
      </div>
  );
}
