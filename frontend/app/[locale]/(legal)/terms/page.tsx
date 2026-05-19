import { generatePageMetadata, getPageContent, DefaultPage } from "../components/default-page";

export async function generateMetadata() {
  return generatePageMetadata(
    "terms",
    "Terms of Service",
    "Read our terms of service to understand the rules and regulations governing the use of our platform."
  );
}

export default async function Terms() {
  const pageContent = await getPageContent("terms");

  return <DefaultPage 
    pageContent={pageContent} 
    showEmptyMessage={true}
  />;
}