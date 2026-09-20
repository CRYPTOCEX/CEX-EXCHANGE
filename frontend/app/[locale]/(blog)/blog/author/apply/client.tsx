"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonText } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen,
  FileText,
  Shield,
  Award,
  PenSquare,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { useBlogStore } from "@/store/blog/user";
import { useConfigStore } from "@/store/config";
import { settingIsTrue } from "@/lib/settings-bool";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";
import { PageHero } from "../../components/page-hero";

export function AuthorGuidelinesClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { user } = useUserStore();
  const router = useRouter();
  const { fetchAuthor, applyForAuthor, author } = useBlogStore();
  const { settings } = useConfigStore();
  const [authorStatus, setAuthorStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState("guidelines");
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch author if not already fetched
  useEffect(() => {
    if (user?.id && !hasFetched) {
      setIsLoading(true);
      fetchAuthor()
        .catch((err: any) => {
          setError(err.message || t("failed_to_fetch_author"));
        })
        .finally(() => {
          setHasFetched(true);
          setIsLoading(false);
        });
    } else if (user?.id && hasFetched) {
      setIsLoading(false);
    } else if (!user?.id) {
      // A signed-out visitor has no application to look up — and this is the page
      // that recruits authors, so they are exactly who should be able to read it.
      // Without this branch `isLoading` never cleared and the whole page was a
      // skeleton that could not resolve.
      setIsLoading(false);
    }
  }, [user?.id, hasFetched, fetchAuthor]);

  // Update local status when author data changes
  useEffect(() => {
    if (author) {
      setAuthorStatus(author.status);
    }
  }, [author]);

  const handleApply = async () => {
    // Applying needs an account. Sending the visitor to sign in and back is the
    // only useful answer — the button used to do nothing at all for them, having
    // read the guidelines and accepted all three sets of terms.
    if (!user?.id) {
      router.push(`/login?return=${encodeURIComponent("/blog/author/apply")}`);
      return;
    }
    setIsSubmitting(true);
    try {
      await applyForAuthor(user.id);
      // After applying, update the local status to "PENDING"
      setAuthorStatus("PENDING");
    } catch (err: any) {
      setError(err.message || t("failed_to_apply_for_author"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Premium background wrapper component
  const PremiumWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen relative overflow-hidden bg-card pt-24">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.03) 10%, hsl(var(--chart-4) / 0.02) 30%, transparent 60%)`,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
        }}
      />
      <FloatingShapes
        count={6}
        interactive={true}
        theme={{ primary: "indigo", secondary: "purple" }}
      />
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.015,
          size: 40,
          interactive: true,
        }}
      />
      <div className="relative z-10 pb-16">{children}</div>
    </div>
  );

  /**
   * WHICH OF THE SIX VIEWS THIS PAGE IS, decided once.
   * ==========================================================================
   *
   * This was five separate `if` statements, each re-deriving part of the same
   * question, with `if (isLoading) return <skeleton/>` sitting in the MIDDLE of
   * them — after the "applications are disabled" check and before the three
   * status checks. That ordering was load-bearing and invisible: the disabled
   * check carried its own `!isLoading &&` because it ran first, while the three
   * status checks carried none because the swap below them did the guarding.
   * Anyone reordering the block would have reintroduced "Application not
   * approved" as the first thing a rejected-status-unknown visitor sees.
   *
   * As one value the decision is stated in one place and the pending case is
   * `null` — not a sixth kind of view, an ABSENCE of the answer. Every branch
   * below now tests the answer rather than a mixture of the answer and the
   * flag, which is also why none of them needs `!isLoading` any more.
   *
   * `settings.enableAuthorApplications` is stored TEXT, so an off switch
   * arrives as the string "false" — which is truthy. Read through the helper or
   * the disabled branch can never be reached and the form shows on a closed
   * programme.
   */
  const view: "disabled" | "approved" | "under-review" | "rejected" | "form" | null =
    isLoading
      ? null
      : !settingIsTrue(settings.enableAuthorApplications, true)
        ? "disabled"
        : authorStatus === "APPROVED"
          ? "approved"
          : authorStatus === "PENDING"
            ? "under-review"
            : authorStatus === "REJECTED"
              ? "rejected"
              : "form";

  if (view === "disabled") {
    return (
      <PremiumWrapper>
        <div className="container mx-auto px-4 py-12">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-destructive/10 rounded-3xl border border-destructive/50">
              <AlertCircle className="h-20 w-20 text-destructive" />
            </div>

            <h1 className="text-4xl font-bold mb-4 text-foreground">
              {t("author_applications_disabled")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t("were_not_accepting_this_time")}. {tCommon("please_check_back_later")}.
            </p>

            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/blog")}
              className="rounded-full border-border-strong text-muted-foreground dark:hover:bg-muted"
            >
              {t("return_to_blog")}
            </Button>
          </m.div>
        </div>
      </PremiumWrapper>
    );
  }

  /*
   * The answer is not in yet.
   *
   * What was here: three `<Skeleton>` boxes — `h-12 w-3/4`, `h-6 w-1/2` and
   * `h-96 w-full` — inside a `py-12 text-center` block that the real page does
   * not have. Measured against what settles: the real heading is `PageHero`,
   * whose title is `text-5xl/text-6xl` with its own badge row and description,
   * i.e. roughly 280px against the 48+24+16 = 88px those two bars reserved;
   * and the panel is a `Tabs` card whose guidelines body runs past 900px
   * against a 384px plate. The page therefore grew by about 700px on arrival.
   *
   * It now renders the REAL hero and the REAL tab bar — both are literals in
   * this file, known before any request — and skeletons only the panel body,
   * whose length depends on which of the five views wins.
   */
  if (view === null) {
    return (
      <PremiumWrapper>
        <PageHero
          badge={{ icon: <Sparkles className="h-3.5 w-3.5" />, text: t("become_an_author") }}
          title={[
            { text: "Become an " },
            { text: "Author", gradient: "bg-primary" },
          ]}
          description={t("share_your_knowledge_our_community")}
        />

        <div className="container mx-auto px-4 pb-16">
          <div className="mx-auto max-w-4xl">
            <div
              aria-busy="true"
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              {/* The tab bar is static chrome — same grid, same padding, same
                  three labels — so it renders identically in both states and
                  the panel below it starts at the same y. */}
              <div className="grid w-full grid-cols-3 p-2 bg-muted/50 dark:bg-surface-2/50">
                {[t("guidelines"), t("rules"), tCommon("apply")].map((label) => (
                  <span
                    key={label}
                    className="rounded-lg px-3 py-1.5 text-center text-sm text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="p-6 space-y-8">
                {[0, 1, 2].map((block) => (
                  <div key={block} className="flex items-start gap-4">
                    <div className="bg-primary/15 rounded-sm p-3 flex-shrink-0">
                      <div className="h-6 w-6 animate-pulse rounded bg-primary/40" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Real typography elements, so the placeholder is
                          measured by the same `text-lg` / body layout that
                          renders the settled copy. */}
                      <h3 className="text-lg font-medium text-foreground">
                        <SkeletonText chars={22} />
                      </h3>
                      <p className="mt-2 text-muted-foreground">
                        <SkeletonText chars={120} />
                      </p>
                      <ul className="mt-4 list-disc list-inside text-muted-foreground space-y-2">
                        {[0, 1, 2].map((item) => (
                          <li key={item}>
                            <SkeletonText chars={52} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PremiumWrapper>
    );
  }

  // Approved status view
  if (view === "approved") {
    return (
      <PremiumWrapper>
        <div className="container mx-auto px-4 py-12">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-success/10 rounded-3xl border border-success/50">
              <CheckCircle className="h-20 w-20 text-success" />
            </div>

            <h1 className="text-4xl font-bold mb-4 text-foreground">
              {t("application_approved")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t("congratulations_you_are_now_an_author")}
            </p>

            <div className="bg-card border border-border rounded-lg p-8 mb-8">
              <h2 className="text-xl font-semibold mb-6 text-foreground">
                {t("what_you_can_do_now")}
              </h2>
              <ul className="space-y-4 text-left">
                {[
                  t("create_new_blog_posts_to_share_your_knowledge"),
                  t("manage_your_published_content_from_your_dashboard"),
                  t("engage_with_readers_your_articles"),
                  t("build_your_author_our_community"),
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="shrink-0 h-8 w-8 rounded-xl bg-success/20 flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-success text-sm font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-muted-foreground pt-1">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/blog")}
                className="rounded-full border-border-strong text-muted-foreground dark:hover:bg-muted"
              >
                {t("return_to_blog")}
              </Button>
              <Button
                size="lg"
                onClick={() => router.push("/blog/author/manage/new")}
                className="rounded-full"
              >
                <PenSquare className="mr-2 h-4 w-4" />
                {t("write_your_first_post")}
              </Button>
            </div>
          </m.div>
        </div>
      </PremiumWrapper>
    );
  }

  // Pending status view
  if (view === "under-review") {
    return (
      <PremiumWrapper>
        <div className="container mx-auto px-4 py-12">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-warning/10 rounded-3xl border border-warning/50">
              <Clock className="h-20 w-20 text-warning" />
            </div>

            <h1 className="text-4xl font-bold mb-4 text-foreground">
              {t("application_under_review")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t("your_application_to_being_reviewed")}
            </p>

            <div className="bg-card border border-border rounded-lg p-8 mb-8">
              <h2 className="text-xl font-semibold mb-6 text-foreground">
                {tCommon("what_happens_next")}
              </h2>
              <ul className="space-y-4 text-left">
                {[
                  t("our_editorial_team_will_review_your_application"),
                  t("this_process_typically_takes_1_3_business_days"),
                  t("youll_receive_an_is_made"),
                  t("if_approved_youll_content_immediately"),
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="shrink-0 h-8 w-8 rounded-xl bg-warning/20 flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-warning text-sm font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-muted-foreground pt-1">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/blog")}
              className="rounded-full border-border-strong text-muted-foreground dark:hover:bg-muted"
            >
              {t("return_to_blog")}
            </Button>
          </m.div>
        </div>
      </PremiumWrapper>
    );
  }

  // Rejected status view
  if (view === "rejected") {
    return (
      <PremiumWrapper>
        <div className="container mx-auto px-4 py-12">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-destructive/10 rounded-3xl border border-destructive/50">
              <AlertCircle className="h-20 w-20 text-destructive" />
            </div>

            <h1 className="text-4xl font-bold mb-4 text-foreground">
              {t("application_not_approved")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t("unfortunately_your_application_this_time")}
            </p>

            <div className="bg-card border border-border rounded-lg p-8 mb-8">
              <h2 className="text-xl font-semibold mb-6 text-foreground">
                {tCommon("what_you_can_do")}
              </h2>
              <ul className="space-y-4 text-left">
                {[
                  t("review_our_author_guidelines_again"),
                  t("continue_engaging_with_our_community"),
                  "You may reapply after 30 days with additional information",
                  t("contact_our_support_team_if_you_have_questions"),
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="shrink-0 h-8 w-8 rounded-xl bg-destructive/20 flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-destructive text-sm font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-muted-foreground pt-1">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/blog")}
              className="rounded-full border-border-strong text-muted-foreground dark:hover:bg-muted"
            >
              {t("return_to_blog")}
            </Button>
          </m.div>
        </div>
      </PremiumWrapper>
    );
  }

  // Default view - application form
  return (
    <PremiumWrapper>
      <PageHero
        badge={{ icon: <Sparkles className="h-3.5 w-3.5" />, text: t("become_an_author") }}
        title={[
          { text: "Become an " },
          { text: "Author", gradient: "bg-primary" },
        ]}
        description={t("share_your_knowledge_our_community")}
      />

      <div className="container mx-auto px-4 pb-16">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto max-w-4xl"
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="bg-card rounded-lg border border-border overflow-hidden"
          >
          <TabsList className="grid w-full grid-cols-3 p-2 bg-muted/50 dark:bg-surface-2/50">
            <TabsTrigger
              value="guidelines"
              className="data-[state=active]:bg-card dark:data-[state=active]:bg-muted rounded-lg text-muted-foreground dark:data-[state=active]:text-foreground transition-all duration-200"
            >
              {t("guidelines")}
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="data-[state=active]:bg-card dark:data-[state=active]:bg-muted rounded-lg text-muted-foreground dark:data-[state=active]:text-foreground transition-all duration-200"
            >
              {t("rules")}
            </TabsTrigger>
            <TabsTrigger
              value="apply"
              className="data-[state=active]:bg-card dark:data-[state=active]:bg-muted rounded-lg text-muted-foreground dark:data-[state=active]:text-foreground transition-all duration-200"
            >
              {tCommon("apply")}
            </TabsTrigger>
          </TabsList>

          {/* The six tiles below carried `text-primary-ink` on the tile AND
              `text-primary` on the icon inside it. The child's class wins, so
              the ink never painted a pixel — it was dead. These are icon tiles,
              not text, so they take the tile idiom used everywhere else in the
              app (`bg-{tone}/15` + `text-{tone}` on the tile, no colour on the
              icon): identical rendering, one class instead of two fighting. */}
          <TabsContent value="guidelines" className="p-6 space-y-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/15 text-primary rounded-sm p-3 flex-shrink-0">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {t("content_guidelines")}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {t("our_blog_focuses_to_readers")}.{" "}
                    {t("we_prioritize_well_researched_and_insight")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-muted-foreground space-y-2">
                    <li>
                      {t("articles_should_be_at_least_800_words_in_length")}
                    </li>
                    <li>{t("content_must_be_published_elsewhere")}</li>
                    <li>{t("include_relevant_examples_when_applicable")}</li>
                    <li>{t("use_proper_formatting_for_readability")}</li>
                    <li>{t("cite_sources_and_factual_claims")}</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/15 text-primary rounded-sm p-3 flex-shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {t("writing_style")}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {t("we_value_clear_our_audience")}.{" "}
                    {t("your_content_should_technical_accuracy")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-muted-foreground space-y-2">
                    <li>{t("write_in_a_clear_conversational_tone")}</li>
                    <li>{t("avoid_jargon_unless_technical_terms")}</li>
                    <li>{t("use_active_voice_and_direct_language")}</li>
                    <li>
                      {t("break_up_text_with_subheadings_lists_and_visuals")}
                    </li>
                    <li>{t("proofread_for_grammar_spelling_and_clarity")}</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/15 text-primary rounded-sm p-3 flex-shrink-0">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {t("author_expectations")}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {t("as_an_author_our_platform")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-muted-foreground space-y-2">
                    <li>{t("publish_at_least_one_article_per_month")}</li>
                    <li>{t("respond_to_comments_on_your_articles")}</li>
                    <li>
                      {t("update_content_when_necessary_to_keep_it_accurate")}
                    </li>
                    <li>{t("participate_in_our_author_community")}</li>
                    <li>{t("maintain_professionalism_in_all_interactions")}</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex items-center">
                <Checkbox
                  id="accept-guidelines"
                  checked={acceptedGuidelines}
                  onCheckedChange={(checked) =>
                    setAcceptedGuidelines(checked === true)
                  }
                  className="h-5 w-5 border-2 border-primary text-primary focus:ring-primary"
                />
                <label
                  htmlFor="accept-guidelines"
                  className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  {t("i_have_read_content_guidelines")}
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setActiveTab("rules")}
                className="rounded-lg group"
              >
                {t("continue_to_rules")}
                <ChevronRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="p-6 space-y-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/15 text-primary rounded-sm p-3 flex-shrink-0">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {t("community_rules")}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {t("our_platform_maintains_all_users")}.{" "}
                    {t("all_authors_must_adhere_to_these_rules")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-muted-foreground space-y-2">
                    <li>
                      {t("no_hate_speech_discrimination_or_harassment")}
                    </li>
                    <li>{t("no_plagiarism_or_copyright_infringement")}</li>
                    <li>{t("no_self_promotion_or_personal_sites")}</li>
                    <li>{t("no_misinformation_or_unverified_claims")}</li>
                    <li>{t("no_political_or_the_topic")}</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/15 text-primary rounded-sm p-3 flex-shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {t("prohibited_content")}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {t("the_following_types_account_suspension")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-muted-foreground space-y-2">
                    <li>{t("adult_or_explicit_content")}</li>
                    <li>{t("content_promoting_illegal_activities")}</li>
                    <li>{t("spam_or_purely_promotional_content")}</li>
                    <li>{t("content_that_violates_others_privacy")}</li>
                    <li>{t("violent_or_graphic_content")}</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/15 text-primary rounded-sm p-3 flex-shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {t("moderation_process")}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {t("all_content_goes_being_published")}.{" "}
                    {t("heres_what_you_need_to_know_about_our_moderation")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-muted-foreground space-y-2">
                    <li>
                      {t("initial_posts_will_be_reviewed_before_publishing")}
                    </li>
                    <li>{t("after_establishing_a_auto_approval_status")}</li>
                    <li>{t("content_that_violates_with_feedback")}</li>
                    <li>{t("repeated_violations_may_author_privileges")}</li>
                    <li>{t("you_can_appeal_support_channel")}</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex items-center">
                <Checkbox
                  id="accept-rules"
                  checked={acceptedRules}
                  onCheckedChange={(checked) =>
                    setAcceptedRules(checked === true)
                  }
                  className="h-5 w-5 border-2 border-primary text-primary focus:ring-primary"
                />
                <label
                  htmlFor="accept-rules"
                  className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  {t("i_have_read_community_rules")}
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveTab("guidelines")}
                className="rounded-lg group border-border-strong text-muted-foreground dark:hover:bg-muted"
              >
                <ChevronLeft className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                {t("back_to_guidelines")}
              </Button>
              <Button
                onClick={() => setActiveTab("apply")}
                className="rounded-lg group"
              >
                {t("continue_to_application")}
                <ChevronRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="apply" className="p-6 space-y-8">
            <div className="space-y-6">
              <div className="bg-primary/20 border border-primary/30 rounded-lg p-6">
                <h3 className="text-lg font-medium text-primary mb-4 flex items-center">
                  <PenSquare className="mr-2 h-5 w-5 text-primary" />
                  {t("ready_to_apply")}
                </h3>
                <p className="text-primary mb-4">
                  {t("before_submitting_your_you_have")}
                </p>
                <ul className="list-disc list-inside text-primary space-y-2 mb-4">
                  <li>{t("read_and_understood_our_content_guidelines")}</li>
                  <li>{t("agreed_to_follow_our_community_rules")}</li>
                  <li>
                    {t("committed_to_publishing_quality_content_regularly")}
                  </li>
                  <li>
                    {t("prepared_to_engage_with_readers_and_the_community")}
                  </li>
                </ul>
                <p className="text-primary">
                  {t("once_submitted_your_editorial_team")}.{" "}
                  {t("this_process_typically_takes_1_3_business_days")}.
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 rounded-lg p-4 text-destructive-ink">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <p className="font-medium">Error</p>
                  </div>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              )}

              <div className="mt-6 flex items-center">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) =>
                    setAcceptedTerms(checked === true)
                  }
                  className="h-5 w-5 border-2 border-primary text-primary focus:ring-primary"
                />
                <label
                  htmlFor="accept-terms"
                  className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  {t("i_agree_to_the_guidelines")}
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveTab("rules")}
                className="rounded-lg group border-border-strong text-muted-foreground dark:hover:bg-muted"
              >
                <ChevronLeft className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                {t("back_to_rules")}
              </Button>
              <Button
                onClick={handleApply}
                disabled={
                  isSubmitting ||
                  !acceptedGuidelines ||
                  !acceptedRules ||
                  !acceptedTerms
                }
                className="rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? `${tCommon("submitting")}…` : tCommon("submit_application")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        </m.div>
      </div>
    </PremiumWrapper>
  );
}
