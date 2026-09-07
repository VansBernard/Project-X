import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, subtitle, action }: PageHeaderProps) {
  const supportingText = description ?? subtitle;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {supportingText && (
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">{supportingText}</p>
        )}
      </div>
      {action && <div className="flex items-center justify-start sm:justify-end">{action}</div>}
    </div>
  );
}
