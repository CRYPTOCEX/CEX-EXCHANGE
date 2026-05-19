import type { Metadata } from "next";
import GuideClient from "./client";

export const metadata: Metadata = {
  title: "AI Market Maker Guide - Admin Dashboard",
  description: "Learn how to use AI Market Maker - Bot types, configuration, and best practices",
};

export default function GuidePage() {
  return <GuideClient />;
}
