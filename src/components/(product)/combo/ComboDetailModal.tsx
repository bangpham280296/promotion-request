"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { TrashBinIcon } from "@/icons";
import { toast } from "sonner";
import { type ComboRecord, parseComboDescription, useCombos } from "@/hooks/useCombos";

type Props = {
  isOpen: boolean;
  combo: ComboRecord | null;
  onClose: () => void;
  onDeleted: () => void;
  isAdmin: boolean;
};

const REQ_STATUS_COLOR: Record<string, "success" | "warning" | "error"> = {
  approved: "success",
  pending: "warning",
  rejected: "error",
};

function getDateStatus(startdate: string | null, enddate: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = startdate ? new Date(startdate) : null;
  const end = enddate ? new Date(enddate) : null;

  if (end && end < today) return { label: "Expired", color: "error" as const };
  if (start && start > today) return { label: "Upcoming", color: "info" as const };
  if (start || end) return { label: "Active", color: "success" as const };
  return { label: "No Date", color: "warning" as const };
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

export default function ComboDetailModal({ isOpen, combo, onClose, onDeleted, isAdmin }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { deleteCombo } = useCombos();

  const handleClose = () => {
    setConfirmDelete(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!combo) return;
    setDeleting(true);
    try {
      await deleteCombo(combo.reqdtlid);
      toast.success(`Combo "${combo.itemcode}" has been removed.`);
      handleClose();
      onDeleted();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!combo) return null;

  const components = parseComboDescription(combo.description);
  const dateStatus = getDateStatus(combo.startdate, combo.enddate);
  const reqStatus = combo.requests?.stt?.name ?? "";
  const reqStatusColor = REQ_STATUS_COLOR[reqStatus.toLowerCase()] ?? "warning";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl p-6" showCloseButton={false}>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Combo Detail
          </h4>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {combo.itemcode} — {combo.itemname}
          </p>
        </div>
        <Badge color={dateStatus.color}>{dateStatus.label}</Badge>
      </div>

      <div className="mt-4 space-y-5">
        {/* Info row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Price</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {combo.price != null ? combo.price.toLocaleString("vi-VN") + " ₫" : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Start Date</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {formatDate(combo.startdate)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">End Date</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {formatDate(combo.enddate)}
            </p>
          </div>
        </div>

        {/* Components table */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Components ({components.length})
          </p>
          {components.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No component data.</p>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-white/[0.05] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-center">
                      No.
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[22%]">
                      Item Code
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Item Name
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-16 text-center">
                      Qty
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[18%] text-right">
                      Unit Price
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {components.map((c, idx) => (
                    <TableRow
                      key={idx}
                      className={c.isAlternative ? "bg-brand-50/30 dark:bg-brand-500/5" : ""}
                    >
                      <TableCell className="px-3 py-2 text-center">
                        {c.isAlternative ? (
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                            OR
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">{c.groupNumber}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 font-mono text-sm text-gray-700 dark:text-gray-300">
                        {c.code}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {c.name}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center text-sm text-gray-700 dark:text-gray-300">
                        {c.qty}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-sm text-gray-700 dark:text-gray-300">
                        {c.unitPrice ? Number(c.unitPrice).toLocaleString("vi-VN") + " ₫" : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Request context */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Source Request
          </p>
          {combo.requests ? (
            <div className="rounded-lg border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.03] px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Request Code</span>
                <span className="text-sm font-mono font-medium text-gray-800 dark:text-white">
                  {combo.requests.requestcode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Promotion</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {combo.requests.promotionname}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Requester</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {combo.requests.employees?.fullname ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Department</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {combo.requests.department?.deptname ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Request Status</span>
                <Badge color={reqStatusColor} size="sm">
                  {reqStatus || "—"}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No request linked.</p>
          )}
        </div>

        {/* Admin — delete section */}
        {isAdmin && (
          <div className="border-t border-gray-100 dark:border-white/[0.05] pt-4">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                <TrashBinIcon />
                Remove this combo from request
              </button>
            ) : (
              <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 space-y-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  This will permanently remove{" "}
                  <span className="font-semibold">{combo.itemcode}</span> from request{" "}
                  <span className="font-semibold font-mono">
                    {combo.requests?.requestcode ?? `#${combo.requests?.reqid}`}
                  </span>
                  . This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "Removing..." : "Yes, Remove"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end">
        <Button variant="outline" size="sm" onClick={handleClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
