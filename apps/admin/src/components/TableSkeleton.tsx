import { Skeleton } from './Skeleton';

interface TableSkeletonProps {
  columnCount: number;
  rowCount?: number;
}

export function TableSkeleton({ columnCount, rowCount = 5 }: TableSkeletonProps) {
  return (
    <tbody className="animate-pulse bg-slate-50">
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-200">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <td key={colIndex} className="px-5 py-4">
              <Skeleton className={`h-3 rounded-full ${colIndex === 0 ? 'w-3/4' : colIndex === columnCount - 1 ? 'w-1/2' : 'w-full'}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
