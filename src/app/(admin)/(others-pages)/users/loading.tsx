import TableSkeleton from "@/components/common/TableSkeleton";

export default function UsersLoading() {
  return (
    <div className="p-4 mx-auto max-w-screen-2xl md:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-52 bg-gray-200 dark:bg-gray-700/60 rounded-md animate-pulse" />
        <div className="h-4 w-96 max-w-full bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse mt-1" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-white/[0.08] pb-3">
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
        <div className="h-5 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <TableSkeleton rows={7} title="Team Members" />
    </div>
  );
}
