"use client";

import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
interface EvidenceTabProps {
  dispute: any;
}
export function EvidenceTab({ dispute }: EvidenceTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence Submitted</CardTitle>
        <CardDescription>
          Documents and evidence provided by both parties
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-medium">Buyer Evidence</h3>
            <div className="space-y-3">
              {dispute.evidence?.filter((e: any) => e.submittedBy === "buyer")
                .length ? (
                dispute.evidence
                  .filter((e: any) => e.submittedBy === "buyer")
                  .map((evidence: any, index: number) => {
                    return (
                      <div key={index} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-medium">{evidence.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded on {evidence.timestamp}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="rounded-md border border-dashed p-4 text-center text-muted-foreground">
                  No evidence submitted by buyer
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-3 font-medium">Seller Evidence</h3>
            <div className="space-y-3">
              {dispute.evidence?.filter((e: any) => e.submittedBy === "seller")
                .length ? (
                dispute.evidence
                  .filter((e: any) => e.submittedBy === "seller")
                  .map((evidence: any, index: number) => {
                    return (
                      <div key={index} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-medium">{evidence.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded on {evidence.timestamp}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="rounded-md border border-dashed p-4 text-center text-muted-foreground">
                  No evidence submitted by seller
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-3 font-medium">Upload Additional Evidence</h3>
            <div className="rounded-md border border-dashed p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                Drag and drop files here
              </p>
              <p className="text-xs text-muted-foreground">
                Or click to browse files
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Upload Evidence
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
