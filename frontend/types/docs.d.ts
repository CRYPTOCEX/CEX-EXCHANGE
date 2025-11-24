interface DocSection {
  id: string;
  title: string;
  content: React.ReactNode;
  subsections?: DocSection[];
}
