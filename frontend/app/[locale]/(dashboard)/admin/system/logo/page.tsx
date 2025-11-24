import type { Metadata } from "next";
import LogoUpload from "@/components/admin/logo-upload";

export const metadata: Metadata = {
  title: "Logo Management",
  description: "Upload and manage platform logos",
};

export default function LogoManagementPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Logo Management</h1>
        <p className="text-muted-foreground mt-2">
          Upload and update logos for your platform. All logo variants will be automatically generated and updated.
        </p>
      </div>
      
      <LogoUpload />
    </div>
  );
} 