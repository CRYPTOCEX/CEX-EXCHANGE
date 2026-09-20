"use client";

/**
 * Brand text, copyright line and social links for the public footer.
 * ============================================================================
 *
 * Every text field here is OPTIONAL and empty means "use the shipped value",
 * which is why each one shows the value it would fall back to as its
 * placeholder. The alternative — pre-filling the boxes with the current values
 * — looks friendlier and is a trap: the first save writes all of them into the
 * database, so the site stops tracking its own defaults and an owner who later
 * renames the site in the env file sees nothing change.
 *
 * The socials list has a third state that the text fields do not. `null` means
 * "use whatever the settings table says", an ARRAY means "use exactly this" —
 * and an EMPTY array means "show none", which is a real answer an owner needs
 * and is not the same as "not configured". Collapsing empty into null would
 * make removing the last social link impossible: it would spring back on save.
 *
 * A social's ICON is an id out of a closed set — the svgs in
 * `public/img/social`, which the footer's resolver knows by name. It is offered
 * as a list of those icons and never as a text field, because an id the
 * resolver does not recognise does not error: it renders the globe. A wrong
 * icon is therefore indistinguishable from a default one, which is why the
 * options come from `SOCIAL_ICON_IDS` in the renderer and not from a copy.
 */

import * as React from "react";
import Image from "next/image";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FooterContent, FooterSocial } from "@/lib/chrome/content";
import { renderCopyright } from "@/lib/chrome/content";
/* The renderer's own list, imported rather than retyped — see the note on the
   icon picker below. */
import {
  DEFAULT_SOCIAL_ICON_ID,
  SOCIAL_ICON_IDS,
  inferSocialIconId,
} from "@/components/partials/footer/use-footer-data";
import { useTranslations } from "next-intl";

/* The build-time fallbacks, shown as placeholders so the owner can see what
   they are overriding. `NEXT_PUBLIC_*` is inlined at build time, which is
   exactly why these became editable — on a hosted install nobody can change an
   env var and rebuild. */
const ENV_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
const ENV_SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  "The most trusted cryptocurrency platform with advanced trading tools and secure storage.";

/**
 * Display names for icon ids. A LABEL map, not a second list.
 *
 * The set of icons is `SOCIAL_ICON_IDS`, imported from the renderer — nothing
 * here may add to it or leave one out. This only spells the ones whose casing a
 * capitalise-the-first-letter rule gets wrong, and anything it does not mention
 * still gets an option and a readable name. Enumerating the icons here instead
 * would be a second source of truth, and the symptom of the two drifting apart
 * is the quietest possible one: the admin picks an icon that the resolver does
 * not recognise and the footer shows a globe, with nothing anywhere to read.
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
 * value (which is not a real icon id and always rendered as a globe), or exactly
 * what the PREVIOUS url would have inferred. Anything else was a click, and a
 * click outlives an edit to the address beside it.
 */
function iconWasAutomatic(social: FooterSocial): boolean {
  return (
    !social.icon ||
    social.icon === "link" ||
    social.icon === DEFAULT_SOCIAL_ICON_ID ||
    social.icon === inferSocialIconId(social.href)
  );
}

export function FooterContentEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: FooterContent;
  onChange: (next: FooterContent) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const set = React.useCallback(
    <K extends keyof FooterContent>(key: K, next: FooterContent[K]) =>
      onChange({ ...value, [key]: next }),
    [onChange, value]
  );

  /* Stored as `null` when blank, so the fallback keeps working. The input still
     needs a string, hence the `?? ""` on the way out. */
  const setText = React.useCallback(
    (key: "siteName" | "siteDescription" | "copyright", raw: string) =>
      set(key, raw.trim() ? raw : null),
    [set]
  );

  const socials = value.socials;
  const usingCustomSocials = socials !== null;

  const setSocial = React.useCallback(
    (index: number, patch: Partial<FooterSocial>) => {
      if (!socials) return;
      set(
        "socials",
        socials.map((s, i) => (i === index ? { ...s, ...patch } : s))
      );
    },
    [set, socials]
  );

  /**
   * Typing the URL also picks the icon — until the owner picks one themselves.
   *
   * Every social link an owner adds has a host that names its icon, so making
   * them choose one afterwards is a step that exists only to be forgotten; the
   * forgotten version is a row of identical globes, which looks like a bug in
   * the footer rather than an unfinished form. `iconWasAutomatic` is what keeps
   * this from being annoying: a deliberate choice is never overwritten.
   */
  const setSocialHref = React.useCallback(
    (index: number, href: string) => {
      if (!socials) return;
      const current = socials[index];
      if (!current) return;
      const icon = iconWasAutomatic(current)
        ? (inferSocialIconId(href) ?? DEFAULT_SOCIAL_ICON_ID)
        : current.icon;
      setSocial(index, { href, icon });
    },
    [setSocial, socials]
  );

  const previewYear = new Date().getFullYear();
  const previewName = value.siteName ?? ENV_SITE_NAME;

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold text-foreground">Brand</h3>

        <div className="space-y-1.5">
          <Label htmlFor="chrome-site-name">{t("site_name")}</Label>
          <Input
            id="chrome-site-name"
            value={value.siteName ?? ""}
            placeholder={ENV_SITE_NAME}
            disabled={disabled}
            onChange={(e) => setText("siteName", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="chrome-site-description">Tagline</Label>
          <Input
            id="chrome-site-description"
            value={value.siteDescription ?? ""}
            placeholder={ENV_SITE_DESCRIPTION}
            disabled={disabled}
            onChange={(e) => setText("siteDescription", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("shown_in_footer_layouts_that_have")}
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold text-foreground">Copyright</h3>
        <Input
          id="chrome-copyright"
          value={value.copyright ?? ""}
          placeholder={t("all_rights_reserved_1")}
          disabled={disabled}
          onChange={(e) => setText("copyright", e.target.value)}
          aria-describedby="chrome-copyright-help"
        />
        <p id="chrome-copyright-help" className="text-[11px] text-muted-foreground">
          <code className="rounded-sm bg-muted px-1">{"{year}"}</code> and{" "}
          <code className="rounded-sm bg-muted px-1">{"{siteName}"}</code> are filled in when
          the page renders — a typed-in year would silently go stale every January.
        </p>
        {value.copyright ? (
          <p className="text-xs text-muted-foreground">
            {t("renders_as")}:{" "}
            <span className="text-foreground">
              {renderCopyright(value.copyright, previewName, previewYear)}
            </span>
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{tCommon("social_links")}</h3>
          {usingCustomSocials ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5"
              disabled={disabled}
              onClick={() => set("socials", null)}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("use_site_settings")}
            </Button>
          ) : null}
        </div>

        {usingCustomSocials ? (
          <>
            {socials.length === 0 ? (
              <Alert tone="info">
                <AlertDescription>
                  {t("no_social_links_the_footer_will")}
                </AlertDescription>
              </Alert>
            ) : null}

            <ul className="space-y-2">
              {socials.map((social, index) => (
                <li
                  key={social.id}
                  /* `bg-muted/30` and not `bg-background`: this row sits INSIDE
                     a `bg-card` section, and `background` is below `card` in
                     dark and level with it in light — the same surface would
                     read as a recess in one theme and as nothing in the other.
                     `muted` is defined against the surface it sits on, so it
                     recesses by the same amount in both. */
                  className="space-y-2 rounded-md border border-border bg-muted/30 p-2"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={social.label}
                      placeholder="Label"
                      aria-label={`Social ${index + 1} label`}
                      className="h-8 w-32 shrink-0 text-sm"
                      disabled={disabled}
                      onChange={(e) => setSocial(index, { label: e.target.value })}
                    />
                    <Input
                      value={social.href}
                      placeholder="https://…"
                      aria-label={`Social ${index + 1} link`}
                      className="h-8 min-w-0 flex-1 text-sm"
                      disabled={disabled}
                      onChange={(e) => setSocialHref(index, e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 p-0"
                      aria-label={`Remove ${social.label || t("social_link")}`}
                      disabled={disabled}
                      onClick={() => set("socials", socials.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>

                  {/* THE ICON PICKER, and the reason it is a list of the real
                      icons rather than a text field. `icon` is an id the
                      footer's resolver understands, and an id it does not
                      understand does not fail — it renders a globe. So a typed
                      icon name, or an option list copied by hand out of the
                      renderer and left behind when an svg is added, produces a
                      footer full of identical globes and no message anywhere.
                      Offering exactly `SOCIAL_ICON_IDS` makes an unrenderable
                      choice impossible to express. */}
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
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            selected
                              ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                              : "border-border hover:border-primary/50 hover:bg-muted"
                          )}
                        >
                          {/* `dark:invert` for the same reason the footer does
                              it: these are flat dark glyphs on transparency, and
                              no colour token can recolour a file. */}
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
                </li>
              ))}
            </ul>

            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5"
              disabled={disabled}
              onClick={() =>
                set("socials", [
                  ...socials,
                  /* The id only has to be stable within this list — it is the
                     React key and nothing else reads it. Deriving it from the
                     href would change under the owner as they type the URL,
                     remounting the input and losing focus on every keystroke.

                     `icon` starts at a REAL icon id. It used to start at
                     `"link"`, which is not one of the shipped svgs, so it fell
                     through the resolver's fallback and every added social came
                     out as the same globe. It is replaced the moment a
                     recognisable URL is typed — see `setSocialHref`. */
                  {
                    id: `social-${Date.now()}`,
                    label: "",
                    href: "",
                    icon: DEFAULT_SOCIAL_ICON_ID,
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("add_social_link")}
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("using_the_social_links_from_system_settings")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={disabled}
              onClick={() => set("socials", [])}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("set_them_here_instead")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
