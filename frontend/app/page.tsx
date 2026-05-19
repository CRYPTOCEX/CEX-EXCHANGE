import { redirect } from "@/i18n/server-routing";

// Root page that redirects to default locale
export default function RootPage() {
  // Redirect to default locale
  redirect("/", "en");
} 