"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminQuestionsStore } from "@/store/faq/question-store";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useState } from "react";

export default function AdminQuestionsClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const { questions, isLoading, fetchQuestions, updateQuestionStatus } =
    useAdminQuestionsStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleStatusChange = async (
    questionId: string,
    status: "PENDING" | "ANSWERED" | "REJECTED"
  ) => {
    try {
      await updateQuestionStatus(questionId, status);
    } catch (error) {
      console.error("Error updating question status:", error);
    }
  };
  const filteredQuestions = questions
    .filter(
      (q) =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.email && q.email.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-800 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case "ANSWERED":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-200"
          >
            Answered
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-200"
          >
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const pendingCount = questions.filter(q => q.status === "PENDING").length;
  const answeredCount = questions.filter(q => q.status === "ANSWERED").length;

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Knowledge Base",
          gradient: "from-sky-500/20 via-blue-500/20 to-sky-500/20",
          iconColor: "text-sky-500",
          textColor: "text-sky-600 dark:text-sky-400",
        }}
        title={[
          { text: "User " },
          {
            text: "Questions",
            gradient:
              "from-sky-600 via-blue-500 to-sky-600 dark:from-sky-400 dark:via-blue-400 dark:to-sky-400",
          },
        ]}
        description={t("manage_user_questions_provide_answers_and")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        background={{
          orbs: [
            {
              color: "#0ea5e9",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#3b82f6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#0ea5e9", "#3b82f6"],
          size: 8,
        }}
        bottomSlot={
          <Card className="bg-card/50 backdrop-blur border-sky-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-linear-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {questions.length} Total Questions
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pendingCount} pending, {answeredCount} answered
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        }
      />

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">{t("all_questions")}</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="ANSWERED">Answered</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          </TabsList>{" "}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search_questions_ellipsis")}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {t("no_questions_found_1")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((question) => {
                return (
                  <Card
                    key={question.id}
                    className={
                      question.status === "PENDING"
                        ? "border-l-4 border-l-yellow-500"
                        : question.status === "ANSWERED"
                          ? "border-l-4 border-l-green-500"
                          : "border-l-4 border-l-red-500"
                    }
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {question.question}
                        </CardTitle>
                        {getStatusBadge(question.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="text-sm text-muted-foreground mb-4">
                        {question.email && (
                          <p>
                            {tCommon("from")}: {question.email}
                          </p>
                        )}
                        <p>
                          {t("submitted_1")}:{" "}
                          {question.createdAt
                            ? new Date(question.createdAt).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {question.status === "PENDING" && (
                          <>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/admin/faq/question/${question.id}/answer`}>
                                Answer
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/admin/faq/question/${question.id}/convert`}>
                                {t("convert_to_faq")}
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(question.id, "REJECTED")
                              }
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {question.status === "ANSWERED" && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/faq/question/${question.id}/convert`}>
                              {t("convert_to_faq")}
                            </Link>
                          </Button>
                        )}
                        {question.status === "REJECTED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(question.id, "PENDING")
                            }
                          >
                            {t("mark_as_pending")}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        {/* Repeat similar structure for "PENDING", "ANSWERED", and "REJECTED" tabs */}
        <TabsContent value="PENDING" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredQuestions.filter((q) => q.status === "PENDING").length ===
            0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {t("no_pending_questions_found_1")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredQuestions
                .filter((q) => q.status === "PENDING")
                .map((question) => {
                  return (
                    <Card
                      key={question.id}
                      className="border-l-4 border-l-yellow-500"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            {question.question}
                          </CardTitle>
                          {getStatusBadge(question.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="text-sm text-muted-foreground mb-4">
                          {question.email && (
                            <p>
                              {tCommon("from")}: {question.email}
                            </p>
                          )}
                          <p>
                            {t("submitted_1")}:{" "}
                            {question.createdAt
                              ? new Date(
                                  question.createdAt
                                ).toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/faq/question/${question.id}/answer`}>
                              Answer
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/faq/question/${question.id}/convert`}>
                              {t("convert_to_faq")}
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(question.id, "REJECTED")
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="ANSWERED" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredQuestions.filter((q) => q.status === "ANSWERED")
              .length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {t("no_answered_questions_found_1")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredQuestions
                .filter((q) => q.status === "ANSWERED")
                .map((question) => {
                  return (
                    <Card
                      key={question.id}
                      className="border-l-4 border-l-green-500"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            {question.question}
                          </CardTitle>
                          {getStatusBadge(question.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="text-sm text-muted-foreground mb-4">
                          {question.email && (
                            <p>
                              {tCommon("from")}: {question.email}
                            </p>
                          )}
                          <p>
                            {t("submitted_1")}:{" "}
                            {question.createdAt
                              ? new Date(
                                  question.createdAt
                                ).toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/faq/question/${question.id}/convert`}>
                              {t("convert_to_faq")}
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="REJECTED" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredQuestions.filter((q) => q.status === "REJECTED")
              .length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {t("no_rejected_questions_found_1")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredQuestions
                .filter((q) => q.status === "REJECTED")
                .map((question) => {
                  return (
                    <Card
                      key={question.id}
                      className="border-l-4 border-l-red-500"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            {question.question}
                          </CardTitle>
                          {getStatusBadge(question.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="text-sm text-muted-foreground mb-4">
                          {question.email && (
                            <p>
                              {tCommon("from")}: {question.email}
                            </p>
                          )}
                          <p>
                            {t("submitted_1")}:{" "}
                            {question.createdAt
                              ? new Date(
                                  question.createdAt
                                ).toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(question.id, "PENDING")
                            }
                          >
                            {t("mark_as_pending")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
          </TabsContent>
        </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
