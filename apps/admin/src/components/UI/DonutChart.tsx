import React from 'react';

type DonutChartProps = {
  value: number;
  total: number;
  size?: number;
  strokeWidth?: number;
};

const DonutChart: React.FC<DonutChartProps> = ({ value, total, size = 180, strokeWidth = 16 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(1, total === 0 ? 0 : value / total));
  const dash = percent * circumference;
  const dashArray = `${dash} ${Math.max(0, circumference - dash)}`;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <circle cx={center} cy={center} r={radius} fill="#fff" />
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e6eef8" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#donutGrad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashArray}
        transform={`rotate(-90 ${center} ${center})`}
      />

      <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" style={{ fontSize: 11, fill: '#6b7280', letterSpacing: '0.06em' }}>
        This Month
      </text>
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: '#0f172a' }}>
        {`$${value.toLocaleString()}`}
      </text>
      <text x="50%" y="74%" dominantBaseline="middle" textAnchor="middle" style={{ fontSize: 12, fill: '#10b981', fontWeight: 600 }}>
        {`${Math.round(percent * 100)}%`}
      </text>
    </svg>
  );
};

export default DonutChart;
