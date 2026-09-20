"use client";

/**
 * The footer's social row, as a full-width list.
 * ============================================================================
 *
 * Lifted out of `components/admin/chrome/footer-content-editor.tsx` rather than
 * embedded from it, because that component is one blob — brand, copyright and
 * socials together — and this screen puts those three on separate rail sections.
 * What was NOT lifted loosely is the behaviour; two invariants come with the
 * code and are restated here so a later edit cannot quietly drop them:
 *
 *   1. THE ICON OPTIONS ARE `SOCIAL_ICON_IDS`, IMPORTED FROM THE RENDERER.
 *      `icon` is an id the footer's resolver understands, and an id it does not
 *      understand does not error — it renders the globe. So a hand-copied option
 *      list that misses an svg, or names one that was renamed, produces a footer
 *      full of identical globes with nothing anywhere to read. The only way to
 *      make an unrenderable choice impossible to express is to offer exactly the
 *      renderer's own list.
 *
 *   2. AN ICON THE ADMIN PICKED SURVIVES A LATER URL EDIT. Typing a URL guesses
 *      the icon, because otherwise every added social is a globe somebody forgot
 *      to finish — but the guess only ever overwrites an icon nobody chose (see
 *      `iconWasAutomatic`). A click outlives an edit to the address beside it.
 *
 * WHY IT LIVES IN THE WORKSPACE AND NOT THE PANEL. A row is a label, a URL and
 * eleven icon targets. In a 340px panel the icons wrap to three lines and the
 * URL box is too narrow to read a URL in, which is the one field here whose tail
 * matters (`/acme` vs `/acme-official`).
 */

import * as React from "react";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FooterSocial } from "@/lib/chrome/content";
import {
  DEFAULT_SOCIAL_ICON_ID,
  SOCIAL_ICON_IDS,
  inferSocialIconId,
  normalizeFooterHref,
} from "@/components/partials/footer/use-footer-data";
import { useTranslations } from "next-intl";

/**
 * Display names for icon ids. A LABEL map, not a second list.
 *
 * The set of icons is `SOCIAL_ICON_IDS`; nothing here may add to it or leave one
 * out. This only spells the ones a capitalise-the-first-letter rule gets wrong,
 * and an id it does not mention still gets an option and a readable name.
 */
const ICON_LABELS: Readonly<Record<string, string>> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  twitter: "X / Twitter",
  youtube: "YouTube",
};

const iconLabel = (id: string): string =>
  ICON_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);

/**
 * Is this icon one the URL picked, rather than one the owner picked?
 *
 * Only an icon nobody chose deliberately may be overwritten when the URL
 * changes. "Nobody chose it" is: blank, the neutral default, the legacy `"link"`
 * value (never a real icon id — it always rendered as a globe), or exactly what
 * the PREVIOUS url would have inferred. Anything else was a click.
 */
function iconWasAutomatic(social: FooterSocial): boolean {
  return (
    !social.icon ||
    social.icon === "link" ||
    social.icon === DEFAULT_SOCIAL_ICON_ID ||
    social.icon === inferSocialIconId(social.href)
  );
}

/**
 * A blank row.
 *
 * The id only has to be stable within this list — it is the React key and
 * nothing else reads it. Deriving it from the href would change under the owner
 * as they type, remounting the input and losing focus on every keystroke.
 *
 * `icon` starts at a REAL icon id and not at `"link"`, which is not one of the
 * shipped svgs and fell through the resolver's fallback, so every added social
 * came out as the same globe.
 */
export function newFooterSocial(): FooterSocial {
  return {
    id: `social-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    label: "",
    href: "",
    icon: DEFAULT_SOCIAL_ICON_ID,
  };
}

export function FooterSocialsEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: FooterSocial[];
  onChange: (next: FooterSocial[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("components");
  const setSocial = React.useCallback(
    (index: number, patch: Partial<FooterSocial>) =>
      onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s))),
    [onChange, value]
  );

  /**
   * Typing the URL also picks the icon — until the owner picks one themselves.
   *
   * Every social link an owner adds has a host that names its icon, so making
   * them choose one afterwards is a step that exists only to be forgotten, and
   * the forgotten version is a row of identical globes: it looks like a bug in
   * the footer rather than an unfinished form.
   */
  const setSocialHref = React.useCallback(
    (index: number, href: string) => {
      const current = value[index];
      if (!current) return;
      const icon = iconWasAutomatic(current)
        ? (inferSocialIconId(href) ?? DEFAULT_SOCIAL_ICON_ID)
        : current.icon;
      setSocial(index, { href, icon });
    },
    [setSocial, value]
  );

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card px-3 py-6 text-center text-xs text-muted-foreground">
          This list is empty, so the footer shows <span className="text-foreground">no</span>{" "}
          social links. Switch the source to <span className="text-foreground">{t("site_settings")}</span>{" "}
          to go back to the list configured under system settings.
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {value.map((social, index) => {
          /* The href the RENDERER will accept, computed with its own rule. A
             bare host is completed rather than rejected, so `facebook.com/acme`
             is fine and only a genuinely unusable value is called out. */
          const resolved = normalizeFooterHref(social.href);
          const broken = social.href.trim().length > 0 && !resolved;

          return (
            <li
              key={social.id}
              /* `bg-card` on the shell's `surface-2` ground: a row here is a
                 raised card, not a recess. */
              className="rounded-lg border border-border bg-card p-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 shrink-0 text-center text-[11px] tabular-nums text-subtle-foreground"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                {/* `removeWrapper` is load-bearing on both boxes. Without it
                    `Input` puts a `flex-1 w-full` div around itself and the
                    className lands on the INNER box — so two fields in a row
                    split the width evenly and a `w-40` label box sits at the
                    start of a half-row gap. */}
                <Input
                  removeWrapper
                  value={social.label}
                  placeholder="Label"
                  aria-label={`Social ${index + 1} label`}
                  className="h-8 w-40 shrink-0 text-sm"
                  disabled={disabled}
                  onChange={(e) => setSocial(index, { label: e.target.value })}
                />
                <Input
                  removeWrapper
                  value={social.href}
                  placeholder="https://… or facebook.com/acme"
                  aria-label={`Social ${index + 1} link`}
                  aria-invalid={broken ? true : undefined}
                  aria-describedby={broken ? `social-${index}-href-error` : undefined}
                  className="h-8 min-w-0 flex-1 text-sm"
                  disabled={disabled}
                  onChange={(e) => setSocialHref(index, e.target.value)}
                />
                <Button
                  type="button"
                  size="2xs"
                  variant="ghost"
                  iconOnly
                  aria-label={`Remove ${social.label || `social link ${index + 1}`}`}
                  title="Remove"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 ps-6">
                {/* THE ICON PICKER — a list of the real icons, never a text
                    field. See invariant 1 in the header comment. */}
                <div
                  role="group"
                  aria-label={`Social ${index + 1} icon`}
                  className="flex flex-wrap items-center gap-1"
                >
                  <span className="me-1 text-[11px] text-muted-foreground">Icon</span>
                  {SOCIAL_ICON_IDS.map((id) => {
                    const selected = social.icon === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${iconLabel(id)} icon for social ${index + 1}`}
                        title={iconLabel(id)}
                        disabled={disabled}
                        onClick={() => setSocial(index, { icon: id })}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                          "focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          selected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                            : "border-border hover:border-primary/50 hover:bg-muted"
                        )}
                      >
                        {/* `dark:invert` for the same reason the footer does it:
                            these are flat dark glyphs on transparency, and no
                            colour token can recolour a file. */}
                        <Image
                          src={`/img/social/${id}.svg`}
                          alt=""
                          width={14}
                          height={14}
                          className="opacity-80 dark:invert"
                        />
                      </button>
                    );
                  })}
                </div>

                {broken ? (
                  <p id={`social-${index}-href-error`} className="text-[11px] text-destructive-ink">
                    The footer will drop this link. Use https://, mailto:, tel:, a site path
                    (/contact), or a bare host.
                  </p>
                ) : resolved && resolved !== social.href.trim() ? (
                  <p className="truncate text-[11px] text-subtle-foreground">
                    Opens {resolved}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        size="2xs"
        variant="outline"
        className="w-full gap-1.5"
        disabled={disabled}
        onClick={() => onChange([...value, newFooterSocial()])}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t("add_social_link")}
      </Button>
    </div>
  );
}
