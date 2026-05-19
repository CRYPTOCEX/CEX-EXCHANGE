import { Metadata } from "next";
import APIDocsClient from "./client";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "Interactive API documentation with code examples, schema visualization, and built-in testing playground.",
  openGraph: {
    title: "API Documentation",
    description:
      "Interactive API documentation with code examples, schema visualization, and built-in testing playground.",
  },
};

export default function APIDocsPage() {
  return <APIDocsClient />;
}
