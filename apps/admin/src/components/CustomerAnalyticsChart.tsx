import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type MetricOption = {
  value: 'New customers' | 'Active customers' | 'Total customers' | 'Returning customers';
  label: string;
};
type PeriodOption = {
  value: 'Yesterday' | 'Last 7 days' | 'Last 30 days' | 'Previous month';
  label: string;
};

export interface CustomerAnalyticsData {
  time: string;
  current: number;
  previous: number;
}

interface CustomerAnalyticsChartProps {
  initialMetric?: MetricOption['value'];
  initialPeriod?: PeriodOption['value'];
}

const metricOptions: MetricOption[] = [
  { value: 'New customers', label: 'New customers' },
  { value: 'Active customers', label: 'Active customers' },
  { value: 'Total customers', label: 'Total customers' },
  { value: 'Returning customers', label: 'Returning customers' },
];

const periodOptions: PeriodOption[] = [
  { value: 'Yesterday', label: 'Yesterday' },
  { value: 'Last 7 days', label: 'Last 7 days' },
  { value: 'Last 30 days', label: 'Last 30 days' },
  { value: 'Previous month', label: 'Previous month' },
];

const hourLabels = Array.from({ length: 24 }, (_, index) => {
  const date = new Date();
  date.setHours(index, 0, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
});

const buildSeries = (scale: number, offset: number) => {
  const baseValues = [0, 0, 1, 2, 3, 5, 6, 8, 10, 13, 15, 18, 20, 21, 20, 18, 16, 14, 12, 9, 7, 5, 3, 1];

  return baseValues.map((value, index) => ({
    time: hourLabels[index],
    value: Math.max(0, Math.round((value + offset) * scale)),
  }));
};

const getMetricScale = (metric: MetricOption['value']) => {
  switch (metric) {
    case 'Active customers':
      return 1.5;
    case 'Total customers':
      return 2.2;
    case 'Returning customers':
      return 1.1;
    default:
      return 1;
  }
};

const getPeriodOffset = (period: PeriodOption['value']) => {
  switch (period) {
    case 'Last 7 days':
      return 2;
    case 'Last 30 days':
      return 4;
    case 'Previous month':
      return 3;
    default:
      return 0;
  }
};

const getMockData = (
  metric: MetricOption['value'],
  period: PeriodOption['value'],
): CustomerAnalyticsData[] => {
  const scale = getMetricScale(metric);
  const offset = getPeriodOffset(period);

  const currentSeries = buildSeries(scale, offset);
  const previousSeries = buildSeries(scale, offset - 1);

  return currentSeries.map((point, index) => ({
    time: point.time,
    current: point.value,
    previous: Math.max(0, previousSeries[index]?.value ?? 0),
  }));
};

const parseTimeLabel = (time: string, daysAgo = 0) => {
  const [hourPart, minutePart] = time.split(':');
  const [minuteString, meridiem] = minutePart.split(' ');
  let hour = Number(hourPart);
  const minute = Number(minuteString);

  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (meridiem === 'PM' && hour !== 12) hour += 12;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
};

const formatTooltipDate = (time: string, daysAgo = 0) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parseTimeLabel(time, daysAgo));
};

const calculatePercentage = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
};

const CustomTooltip = ({
  active,
  payload,
  label,
  metric,
}: any) => {
  if (!active || !payload || payload.length < 2) {
    return null;
  }

  const currentPoint = payload.find((item: any) => item.dataKey === 'current');
  const previousPoint = payload.find((item: any) => item.dataKey === 'previous');
  const currentValue = currentPoint?.value ?? 0;
  const previousValue = previousPoint?.value ?? 0;
  const percentValue = calculatePercentage(currentValue, previousValue);
  const percentageLabel = previousValue === 0 && currentValue > 0 ? '100.0%' : `${percentValue.toFixed(1)}%`;
  const currentDateLabel = formatTooltipDate(label, 0);
  const previousDateLabel = formatTooltipDate(label, 1);

  return (
    <div className="w-full max-w-[520px] rounded-[20px] bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{metric}</p>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {percentageLabel}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#9564F2]" />
            <p className="font-semibold text-slate-900">{currentDateLabel}</p>
          </div>
          <span className="font-semibold text-slate-900">{currentValue}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
            <p className="font-semibold text-slate-900">{previousDateLabel}</p>
          </div>
          <span className="font-semibold text-slate-900">{previousValue}</span>
        </div>
      </div>
    </div>
  );
};

const CustomerAnalyticsChart = ({
  initialMetric = 'New customers',
  initialPeriod = 'Yesterday',
}: CustomerAnalyticsChartProps) => {
  const [metric, setMetric] = useState<MetricOption['value']>(initialMetric);
  const [period, setPeriod] = useState<PeriodOption['value']>(initialPeriod);

  const data = useMemo(() => getMockData(metric, period), [metric, period]);

  const lastPoint = data[data.length - 1] ?? { time: '12:00 AM', current: 0, previous: 0 };
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-5xl font-bold tracking-tight text-slate-900">{lastPoint.current}</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.3em] text-slate-500">{timeLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[160px] rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <select
                value={metric}
                onChange={(event) => setMetric(event.target.value as MetricOption['value'])}
                className="w-full bg-transparent pr-8 text-sm outline-none appearance-none"
              >
                {metricOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>

            <div className="relative min-w-[160px] rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as PeriodOption['value'])}
                className="w-full bg-transparent pr-8 text-sm outline-none appearance-none"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-6 relative h-[300px] min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 16, left: 16, bottom: 8 }}>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                ticks={[data[0]?.time, data[data.length - 1]?.time]}
                interval={0}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis hide />
              <Tooltip
                content={<CustomTooltip metric={metric} />}
                cursor={false}
                wrapperStyle={{ pointerEvents: 'none' }}
                allowEscapeViewBox={{ x: true, y: true }}
                contentStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="#94A3B8"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#9564F2"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 8, fill: '#9564F2', stroke: '#ffffff', strokeWidth: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalyticsChart;
