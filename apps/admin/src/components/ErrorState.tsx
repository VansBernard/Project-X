interface ErrorStateProps {
  title: string;
  description: string;
}

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <p className="text-2xl font-semibold text-red-900">{title}</p>
      <p className="text-red-700 mt-2">{description}</p>
    </div>
  );
}
