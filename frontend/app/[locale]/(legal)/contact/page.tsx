import { generatePageMetadata, getPageContent, DefaultPage } from "../components/default-page";

export async function generateMetadata() {
  return generatePageMetadata(
    "contact",
    "Contact us",
    "Get in touch with our support team for assistance with your account or any questions."
  );
}

export default async function Contact() {
  const pageContent = await getPageContent("contact");

  return <DefaultPage 
    pageContent={pageContent} 
    showEmptyMessage={true}
  />;
}