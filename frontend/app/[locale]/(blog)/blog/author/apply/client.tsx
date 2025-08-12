"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useBlogStore } from "@/store/blog/user";
import { useConfigStore } from "@/store/config";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

export function AuthorGuidelinesClient() {
  const t = useTranslations("blog");
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
          setError(err.message || "Failed to fetch author");
        })
        .finally(() => {
          setHasFetched(true);
          setIsLoading(false);
        });
    } else if (user?.id && hasFetched) {
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
    if (user?.id) {
      setIsSubmitting(true);
      try {
        await applyForAuthor(user.id);
        // After applying, update the local status to "PENDING"
        setAuthorStatus("PENDING");
      } catch (err: any) {
        setError(err.message || "Failed to apply for author");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // If applications are disabled, show disabled view
  if (!isLoading && !settings.enableAuthorApplications) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center justify-center p-6 bg-red-50 dark:bg-red-950/20 rounded-full">
            <AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400" />
          </div>

          <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            {t("author_applications_disabled")}
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-300 mb-8">
            {t("were_not_accepting_this_time")}. {t("please_check_back_later")}.
          </p>

          <Button
            variant="outline"
            onClick={() => router.push("/blog")}
            className="rounded-lg dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {t("return_to_blog")}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </div>
        <div className="mx-auto max-w-4xl">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Approved status view
  if (authorStatus === "APPROVED") {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center justify-center p-6 bg-green-50 dark:bg-green-950/20 rounded-full">
            <CheckCircle className="h-16 w-16 text-green-500 dark:text-green-400" />
          </div>

          <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            {t("application_approved")}
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-300 mb-8">
            {t("congratulations_you_are_now_an_author")}
          </p>

          <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
              {t("what_you_can_do_now")}
            </h2>
            <ul className="space-y-3 text-left mb-6">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-sm font-bold">
                    1
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("create_new_blog_posts_to_share_your_knowledge")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-sm font-bold">
                    2
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("manage_your_published_content_from_your_dashboard")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-sm font-bold">
                    3
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("engage_with_readers_your_articles")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-sm font-bold">
                    4
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("build_your_author_our_community")}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => router.push("/blog")}
              className="rounded-lg dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t("return_to_blog")}
            </Button>
            <Button
              onClick={() => router.push("/blog/author/manage/new")}
              className="rounded-lg"
            >
              <PenSquare className="mr-2 h-4 w-4" />
              {t("write_your_first_post")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pending status view
  if (authorStatus === "PENDING") {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center justify-center p-6 bg-yellow-50 dark:bg-yellow-950/20 rounded-full">
            <Clock className="h-16 w-16 text-yellow-500 dark:text-yellow-400" />
          </div>

          <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            {t("application_under_review")}
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-300 mb-8">
            {t("your_application_to_being_reviewed")}
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/50 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
              {t("what_happens_next")}
            </h2>
            <ul className="space-y-3 text-left mb-6">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm font-bold">
                    1
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("our_editorial_team_will_review_your_application")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm font-bold">
                    2
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("this_process_typically_takes_1-3_business_days")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm font-bold">
                    3
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("youll_receive_an_is_made")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm font-bold">
                    4
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("if_approved_youll_content_immediately")}
                </span>
              </li>
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push("/blog")}
            className="rounded-lg dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {t("return_to_blog")}
          </Button>
        </div>
      </div>
    );
  }

  // Rejected status view
  if (authorStatus === "REJECTED") {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center justify-center p-6 bg-red-50 dark:bg-red-950/20 rounded-full">
            <AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400" />
          </div>

          <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            {t("application_not_approved")}
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-300 mb-8">
            {t("unfortunately_your_application_this_time")}
          </p>

          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
              {t("what_you_can_do")}
            </h2>
            <ul className="space-y-3 text-left mb-6">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-red-600 dark:text-red-400 text-sm font-bold">
                    1
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("review_our_author_guidelines_again")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-red-600 dark:text-red-400 text-sm font-bold">
                    2
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("continue_engaging_with_our_community")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-red-600 dark:text-red-400 text-sm font-bold">
                    3
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("you_may_reapply_additional_information")}
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-red-600 dark:text-red-400 text-sm font-bold">
                    4
                  </span>
                </div>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {t("contact_our_support_team_if_you_have_questions")}
                </span>
              </li>
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push("/blog")}
            className="rounded-lg dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {t("return_to_blog")}
          </Button>
        </div>
      </div>
    );
  }

  // Default view - application form
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
          {t("become_an_author")}
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-300">
          {t("share_your_knowledge_our_community")}
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm dark:shadow-zinc-900/50"
        >
          <TabsList className="grid w-full grid-cols-3 p-1 rounded-t-lg bg-zinc-50 dark:bg-zinc-900">
            <TabsTrigger
              value="guidelines"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm rounded-md dark:text-zinc-300 dark:data-[state=active]:text-zinc-100"
            >
              {t("Guidelines")}
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm rounded-md dark:text-zinc-300 dark:data-[state=active]:text-zinc-100"
            >
              {t("Rules")}
            </TabsTrigger>
            <TabsTrigger
              value="apply"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm rounded-md dark:text-zinc-300 dark:data-[state=active]:text-zinc-100"
            >
              {t("Apply")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guidelines" className="p-6 space-y-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 dark:bg-indigo-950/30 rounded-full p-3 flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {t("content_guidelines")}
                  </h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    {t("our_blog_focuses_to_readers")}.{" "}
                    {t("we_prioritize_well-researched_and_insight")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2">
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
                <div className="bg-indigo-100 dark:bg-indigo-950/30 rounded-full p-3 flex-shrink-0">
                  <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {t("writing_style")}
                  </h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    {t("we_value_clear_our_audience")}.{" "}
                    {t("your_content_should_technical_accuracy")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2">
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
                <div className="bg-indigo-100 dark:bg-indigo-950/30 rounded-full p-3 flex-shrink-0">
                  <Award className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {t("author_expectations")}
                  </h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    {t("as_an_author_our_platform")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2">
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
                  className="h-5 w-5 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-700"
                />
                <label
                  htmlFor="accept-guidelines"
                  className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-900 dark:text-zinc-300"
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
                <div className="bg-indigo-100 dark:bg-indigo-950/30 rounded-full p-3 flex-shrink-0">
                  <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {t("community_rules")}
                  </h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    {t("our_platform_maintains_all_users")}.{" "}
                    {t("all_authors_must_adhere_to_these_rules")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2">
                    <li>
                      {t("no_hate_speech_discrimination_or_harassment")}
                    </li>
                    <li>{t("no_plagiarism_or_copyright_infringement")}</li>
                    <li>{t("no_self-promotion_or_personal_sites")}</li>
                    <li>{t("no_misinformation_or_unverified_claims")}</li>
                    <li>{t("no_political_or_the_topic")}</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 dark:bg-indigo-950/30 rounded-full p-3 flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {t("prohibited_content")}
                  </h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    {t("the_following_types_account_suspension")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2">
                    <li>{t("adult_or_explicit_content")}</li>
                    <li>{t("content_promoting_illegal_activities")}</li>
                    <li>{t("spam_or_purely_promotional_content")}</li>
                    <li>{t("content_that_violates_others_privacy")}</li>
                    <li>{t("violent_or_graphic_content")}</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 dark:bg-indigo-950/30 rounded-full p-3 flex-shrink-0">
                  <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {t("moderation_process")}
                  </h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    {t("all_content_goes_being_published")}.{" "}
                    {t("heres_what_you_need_to_know_about_our_moderation")}.
                  </p>
                  <ul className="mt-4 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-2">
                    <li>
                      {t("initial_posts_will_be_reviewed_before_publishing")}
                    </li>
                    <li>{t("after_establishing_a_auto-approval_status")}</li>
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
                  className="h-5 w-5 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-700"
                />
                <label
                  htmlFor="accept-rules"
                  className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-900 dark:text-zinc-300"
                >
                  {t("i_have_read_community_rules")}
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveTab("guidelines")}
                className="rounded-lg group dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
              <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-300 mb-4 flex items-center">
                  <PenSquare className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  {t("ready_to_apply")}
                </h3>
                <p className="text-indigo-700 dark:text-indigo-300 mb-4">
                  {t("before_submitting_your_you_have")}
                </p>
                <ul className="list-disc list-inside text-indigo-700 dark:text-indigo-300 space-y-2 mb-4">
                  <li>{t("read_and_understood_our_content_guidelines")}</li>
                  <li>{t("agreed_to_follow_our_community_rules")}</li>
                  <li>
                    {t("committed_to_publishing_quality_content_regularly")}
                  </li>
                  <li>
                    {t("prepared_to_engage_with_readers_and_the_community")}
                  </li>
                </ul>
                <p className="text-indigo-700 dark:text-indigo-300">
                  {t("once_submitted_your_editorial_team")}.{" "}
                  {t("this_process_typically_takes_1-3_business_days")}.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 text-red-700 dark:text-red-400">
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
                  className="h-5 w-5 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-700"
                />
                <label
                  htmlFor="accept-terms"
                  className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-900 dark:text-zinc-300"
                >
                  {t("i_agree_to_the_guidelines")}
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveTab("rules")}
                className="rounded-lg group dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
                className="rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
