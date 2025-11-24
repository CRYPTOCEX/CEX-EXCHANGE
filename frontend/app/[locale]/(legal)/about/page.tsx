import { generatePageMetadata, getPageContent, DefaultPage } from "../components/default-page";

export async function generateMetadata() {
  return generatePageMetadata(
    "about",
    "About Us",
    "Learn more about our mission, values, and commitment to providing the best cryptocurrency trading experience."
  );
}

export default async function About() {
  const pageContent = await getPageContent("about");

  return <DefaultPage 
    pageContent={pageContent} 
    showEmptyMessage={true}
  />;
}