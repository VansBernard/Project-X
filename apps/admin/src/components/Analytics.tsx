/**
 * Analytics & Statistics Components
 */
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
  icon?: ReactNode;
  trend?: number[];
  onClick?: () => void;
}

export function StatCard({ title, value, change, icon, onClick }: StatCardProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg p-6 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {change && (
            <div className={`text-sm mt-2 flex items-center gap-1 ${change.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              <span>{change.direction === 'up' ? '↑' : '↓'}</span>
              <span>{change.value}%</span>
              <span className="text-gray-500 dark:text-gray-400">{change.period}</span>
            </div>
          )}
        </div>
        {icon && <div className="text-3xl opacity-10">{icon}</div>}
      </div>
    </div>
  );
}

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function ChartContainer({ title, subtitle, children, action }: ChartContainerProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

interface MetricBadgeProps {
  label: string;
  value: string | number;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

const colorMap = {
  green: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  red: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  blue: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
};

const sizeMap = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export function MetricBadge({ label, value, color = 'gray', size = 'md' }: MetricBadgeProps) {
  return (
    <div className={`${colorMap[color]} ${sizeMap[size]} rounded-lg font-medium`}>
      <div className="flex items-center gap-2">
        <span className="opacity-75">{label}:</span>
        <span className="font-bold">{value}</span>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: 'green' | 'blue' | 'red' | 'yellow';
}

const progressColorMap = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
};

export function ProgressBar({ value, max = 100, label, color = 'blue' }: ProgressBarProps) {
  const percentage = (value / max) * 100;

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</p>}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${progressColorMap[color]} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{percentage.toFixed(1)}%</p>
    </div>
  );
}

interface KPIGridProps {
  children: ReactNode;
}

export function KPIGrid({ children }: KPIGridProps) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{children}</div>;
}
