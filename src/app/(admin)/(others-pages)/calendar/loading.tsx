import React from "react";

export default function CalendarLoading() {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
      {/* 1. Calendar Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        {/* Month/Year Title & Navigation */}
        <div className="flex items-center gap-3">
          <div className="h-7 w-44 bg-gray-200 dark:bg-gray-700/60 rounded-md" />
          <div className="flex items-center gap-1">
            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
          <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>

        {/* View Mode Buttons (Month / Week / Day) */}
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-white/[0.02] p-1 rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700/60 rounded-lg" />
          <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>
      </div>

      {/* 2. Days of Week Header */}
      <div className="grid grid-cols-7 gap-px border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 rounded-t-xl overflow-hidden mb-px">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="bg-gray-50 dark:bg-gray-900/60 py-2.5 text-center"
          >
            <div className="h-4 w-10 mx-auto bg-gray-200 dark:bg-gray-700/60 rounded" />
          </div>
        ))}
      </div>

      {/* 3. 7x5 Month Grid Skeleton */}
      <div className="grid grid-cols-7 gap-px border border-gray-200 dark:border-gray-800 bg-gray-200 dark:bg-gray-800 rounded-b-xl overflow-hidden">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="min-h-[105px] bg-white dark:bg-gray-900/40 p-2.5 flex flex-col justify-between"
          >
            {/* Day number */}
            <div className="h-4 w-5 bg-gray-200 dark:bg-gray-700/60 rounded self-end" />

            {/* Event mockups */}
            <div className="space-y-1.5 mt-2">
              {i % 3 === 0 && (
                <div className="h-5 w-full bg-brand-500/20 dark:bg-brand-500/15 rounded px-1.5 flex items-center">
                  <div className="h-2 w-3/4 bg-brand-500/30 rounded" />
                </div>
              )}
              {i % 4 === 1 && (
                <div className="h-5 w-4/5 bg-purple-500/20 dark:bg-purple-500/15 rounded px-1.5 flex items-center">
                  <div className="h-2 w-2/3 bg-purple-500/30 rounded" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
