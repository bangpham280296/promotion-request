import React from "react";

export default function RequestLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* 1. Form Inputs Card Skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700/60 rounded-md" />
            <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded-md mt-1.5" />
          </div>
          <div className="h-9 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700/60 rounded" />
            <div className="h-11 w-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700/60 rounded" />
            <div className="h-11 w-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700/60 rounded" />
            <div className="h-11 w-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700/60 rounded" />
            <div className="h-11 w-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700/60 rounded" />
            <div className="h-11 w-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 2. Detail Table Card Skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700/60 rounded" />
          <div className="h-9 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 py-3 px-4 bg-gray-50 dark:bg-white/[0.02] rounded-lg mb-3">
          <div className="col-span-1 h-4 bg-gray-200 dark:bg-gray-700/70 rounded" />
          <div className="col-span-2 h-4 bg-gray-200 dark:bg-gray-700/70 rounded" />
          <div className="col-span-3 h-4 bg-gray-200 dark:bg-gray-700/70 rounded" />
          <div className="col-span-2 h-4 bg-gray-200 dark:bg-gray-700/70 rounded" />
          <div className="col-span-2 h-4 bg-gray-200 dark:bg-gray-700/70 rounded" />
          <div className="col-span-2 h-4 bg-gray-200 dark:bg-gray-700/70 rounded" />
        </div>

        {/* Table Rows */}
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-3 items-center py-3.5 px-4 rounded-lg border border-gray-100 dark:border-gray-800/60"
            >
              <div className="col-span-1 h-4 w-6 bg-gray-200 dark:bg-gray-700/60 rounded" />
              <div className="col-span-2 h-4 w-20 bg-gray-200 dark:bg-gray-700/60 rounded" />
              <div className="col-span-3 h-4 w-36 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="col-span-2 h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="col-span-2 h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="col-span-2 flex justify-end">
                <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-gray-700/60" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Submit Button Skeleton */}
      <div className="flex justify-center pt-2">
        <div className="h-11 w-32 rounded-lg bg-gray-200 dark:bg-gray-700/70" />
      </div>
    </div>
  );
}
