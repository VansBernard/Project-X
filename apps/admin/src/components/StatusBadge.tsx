interface StatusBadgeProps {
  status: string;
}

const statusClasses: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  deleted: 'bg-red-100 text-red-800',
  prospect: 'bg-blue-100 text-blue-800',
  delinquent: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  blocked: 'bg-gray-100 text-gray-700',
  archived: 'bg-gray-100 text-gray-700',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() ?? 'unknown';
  const classes = statusClasses[normalized] ?? 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}
