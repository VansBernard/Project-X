interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
      <p className="text-2xl font-semibold text-gray-900">{title}</p>
      <p className="text-gray-500 mt-2">{description}</p>
    </div>
  );
}
