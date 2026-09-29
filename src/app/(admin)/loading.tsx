import TableSkeleton from "@/components/common/TableSkeleton";

export default function AdminLoading() {
  return (
    <div className="w-full space-y-6">
      <TableSkeleton rows={7} title="Promotion Requests" />
    </div>
  );
}
