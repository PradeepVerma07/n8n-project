import React from 'react';

export function CardSkeleton({ count = 1, className = '' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-xs animate-pulse ${className}`}
        >
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
          <div className="h-7 bg-slate-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-slate-100 rounded w-2/3"></div>
        </div>
      ))}
    </>
  );
}

export function TableRowSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-100">
          <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
          <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-48"></div></td>
          <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
          <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
          <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
        </tr>
      ))}
    </>
  );
}
