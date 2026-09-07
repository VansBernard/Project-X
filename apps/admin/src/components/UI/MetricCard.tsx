import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  trend,
  iconColor = 'bg-primary/10 text-primary',
}) => {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border border-[#EDF2F7] card-shadow group hover:border-primary/30 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${iconColor}`}>{icon}</div>
        {trend && (
          <span className={`text-label-md font-label-md flex items-center gap-1 ${trend.isPositive ? 'text-secondary' : 'text-error'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-on-surface-variant text-sm">{label}</p>
      <h2 className="mt-1 text-2xl font-bold text-on-surface">{value}</h2>
    </div>
  );
};
