interface GuideHeaderProps {
  title: string;
  description: string;
}

export function GuideHeader({ title, description }: GuideHeaderProps) {
  return (
    <div className="mb-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
