import { generatePageMetadata, getPageContent, DefaultPage } from "../components/default-page";

export async function generateMetadata() {
  return generatePageMetadata(
    "privacy",
    "Privacy Policy",
    "Our privacy policy explains how we collect, use, and protect your personal information."
  );
}

export default async function Privacy() {
  const pageContent = await getPageContent("privacy");

  return <DefaultPage 
    pageContent={pageContent} 
    showEmptyMessage={true}
  />;
}