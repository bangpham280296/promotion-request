import React from "react";

interface TableSkeletonProps {
  rows?: number;
  title?: string;
}

export default function TableSkeleton({ rows = 6, title }: TableSkeletonProps) {
  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 md:p-6 animate-pulse">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          {title ? (
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-1">
              {title}
            </h3>
          ) : (
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700/60 rounded-md"></div>
          )}
          <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded-md mt-1"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
          <div className="h-10 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
        </div>
      </div>

      {/* Filter Tabs / Badges Placeholder */}
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700/60 rounded-lg"></div>
        <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
        <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
      </div>

      {/* Table Mockup */}
      <div className="overflow-x-auto">
        <div className="min-w-[650px]">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-gray-50 dark:bg-white/[0.02] rounded-lg mb-3">
            <div className="col-span-3 h-4 bg-gray-200 dark:bg-gray-700/70 rounded"></div>
            <div className="col-span-4 h-4 bg-gray-200 dark:bg-gray-700/70 rounded"></div>
            <div className="col-span-2 h-4 bg-gray-200 dark:bg-gray-700/70 rounded"></div>
            <div className="col-span-2 h-4 bg-gray-200 dark:bg-gray-700/70 rounded"></div>
            <div className="col-span-1 h-4 bg-gray-200 dark:bg-gray-700/70 rounded"></div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {[...Array(rows)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-4 items-center py-3.5 px-4 rounded-lg border border-gray-100 dark:border-gray-800/60"
              >
                <div className="col-span-3 flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700/50"></div>
                  <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700/60 rounded"></div>
                </div>
                <div className="col-span-4 h-4 w-4/5 bg-gray-100 dark:bg-gray-800 rounded"></div>
                <div className="col-span-2 h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded"></div>
                <div className="col-span-2">
                  <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700/60"></div>
                </div>
                <div className="col-span-1 flex justify-end">
                  <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-5 mt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded"></div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700/60"></div>
          <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
          <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
        </div>
      </div>
    </div>
  );
}
