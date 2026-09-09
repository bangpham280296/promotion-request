import TableSkeleton from "@/components/common/TableSkeleton";

export default function OthersPagesLoading() {
  return (
    <div className="w-full space-y-6">
      <TableSkeleton rows={8} />
    </div>
  );
}
