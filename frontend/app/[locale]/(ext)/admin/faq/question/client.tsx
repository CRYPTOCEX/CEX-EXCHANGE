"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConvertToFaqDialog } from "./components/convert-to-faq-dialog";
import { AnswerQuestionDialog } from "./components/answer-question-dialog";
import { useAdminQuestionsStore } from "@/store/faq/question-store";
export default function AdminQuestionsClient() {
  const { questions, isLoading, fetchQuestions, updateQuestionStatus } =
    useAdminQuestionsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuestion, setSelectedQuestion] =
    useState<faqQuestionAttributes | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
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
  const handleConvertToFaq = (question: faqQuestionAttributes) => {
    setSelectedQuestion(question);
    setShowConvertDialog(true);
  };
  const handleAnswerQuestion = (question: faqQuestionAttributes) => {
    setSelectedQuestion(question);
    setShowAnswerDialog(true);
  };
  const handleRefresh = () => {
    fetchQuestions();
  };
  const filteredQuestions = questions
    .filter(
      (q) =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.email && q.email.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .filter((q) => statusFilter === "all" || q.status === statusFilter)
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
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              User Questions
            </h1>
            <p className="text-muted-foreground">
              Manage user questions, provide answers, and convert them into FAQs
              for your knowledge base.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">All Questions</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="ANSWERED">Answered</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          </TabsList>{" "}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
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
                <p className="text-muted-foreground">No questions found.</p>
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
                        {question.email && <p>From: {question.email}</p>}
                        <p>
                          Submitted:{" "}
                          {question.createdAt
                            ? new Date(question.createdAt).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {question.status === "PENDING" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAnswerQuestion(question)}
                            >
                              Answer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConvertToFaq(question)}
                            >
                              Convert to FAQ
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertToFaq(question)}
                          >
                            Convert to FAQ
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
                            Mark as Pending
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
                  No pending questions found.
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
                          {question.email && <p>From: {question.email}</p>}
                          <p>
                            Submitted:{" "}
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
                            onClick={() => handleAnswerQuestion(question)}
                          >
                            Answer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertToFaq(question)}
                          >
                            Convert to FAQ
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
                  No answered questions found.
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
                          {question.email && <p>From: {question.email}</p>}
                          <p>
                            Submitted:{" "}
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
                            onClick={() => handleConvertToFaq(question)}
                          >
                            Convert to FAQ
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
                  No rejected questions found.
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
                          {question.email && <p>From: {question.email}</p>}
                          <p>
                            Submitted:{" "}
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
                            Mark as Pending
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

      {selectedQuestion && (
        <>
          <ConvertToFaqDialog
            open={showConvertDialog}
            onOpenChange={setShowConvertDialog}
            question={selectedQuestion}
            onConvert={(faqId) => {
              // Update question status
              handleStatusChange(selectedQuestion.id, "ANSWERED");
              // Close dialog and reset
              setShowConvertDialog(false);
              setSelectedQuestion(null);
            }}
          />

          <AnswerQuestionDialog
            open={showAnswerDialog}
            onOpenChange={setShowAnswerDialog}
            question={selectedQuestion}
            onAnswer={() => {
              // Update question status
              handleStatusChange(selectedQuestion.id, "ANSWERED");
              // Close dialog and reset
              setShowAnswerDialog(false);
              setSelectedQuestion(null);
            }}
          />
        </>
      )}
    </div>
  );
}
