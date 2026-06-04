"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { toast } from "sonner";
import type { SyncPreviewResult } from "@/app/api/items/sync-preview/route";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ItemSyncModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [preview, setPreview]     = useState<SyncPreviewResult | null>(null);
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    setSelected(new Set());

    try {
      const res  = await fetch("/api/items/sync-preview");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch");
      setPreview(data as SyncPreviewResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when modal opens
  useEffect(() => {
    if (isOpen) fetchPreview();
  }, [isOpen, fetchPreview]);

  const toggleItem = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    setSelected(
      selected.size === preview.missingItems.length
        ? new Set()
        : new Set(preview.missingItems.map((i) => i.itemcode))
    );
  };

  const handleImport = async () => {
    if (!preview || selected.size === 0) return;
    setImporting(true);

    const items = preview.missingItems.filter((i) => selected.has(i.itemcode));

    try {
      const res  = await fetch("/api/items/sync-import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");

      toast.success(`Imported ${data.imported} item${data.imported !== 1 ? "s" : ""} successfully.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const allSelected =
    !!preview &&
    preview.missingItems.length > 0 &&
    selected.size === preview.missingItems.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Sync Items from SQL Server
          </h4>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Danh sách item có trong SQL Server nhưng chưa tồn tại trong Supabase.
          </p>
        </div>
        <button
          onClick={fetchPreview}
          disabled={loading || importing}
          className="text-xs text-brand-500 hover:text-brand-600 disabled:opacity-40 whitespace-nowrap ml-4"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Stats */}
      {preview && !loading && (
        <div className="mb-4 flex gap-3">
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] px-4 py-2 text-center min-w-[80px]">
            <p className="text-xs text-gray-400">SQL Server</p>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
              {preview.totalSql.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] px-4 py-2 text-center min-w-[80px]">
            <p className="text-xs text-gray-400">Supabase</p>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
              {preview.totalSupabase.toLocaleString()}
            </p>
          </div>
          <div
            className={`rounded-lg px-4 py-2 text-center min-w-[80px] ${
              preview.missingItems.length > 0
                ? "bg-orange-50 dark:bg-orange-900/20"
                : "bg-green-50 dark:bg-green-900/20"
            }`}
          >
            <p className="text-xs text-gray-400">Missing</p>
            <p
              className={`text-base font-semibold ${
                preview.missingItems.length > 0
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {preview.missingItems.length.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
          Đang kết nối SQL Server và so sánh dữ liệu...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* All synced */}
      {!loading && !error && preview && preview.missingItems.length === 0 && (
        <div className="py-10 text-center text-sm text-green-500">
          ✓ Supabase đã có đầy đủ tất cả items từ SQL Server.
        </div>
      )}

      {/* Missing items table */}
      {!loading && !error && preview && preview.missingItems.length > 0 && (
        <>
          {/* Select all bar */}
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Select All
                <span className="ml-1 text-gray-400">({preview.missingItems.length})</span>
              </span>
            </label>
            {selected.size > 0 && (
              <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                {selected.size} selected
              </span>
            )}
          </div>

          {/* Table */}
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/[0.08]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                <tr>
                  <th className="w-10 px-3 py-2.5" />
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                    Item Code
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                    Item Name
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                    Price (VND)
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {preview.missingItems.map((item) => {
                  const checked = selected.has(item.itemcode);
                  return (
                    <tr
                      key={item.itemcode}
                      onClick={() => toggleItem(item.itemcode)}
                      className={`cursor-pointer transition-colors ${
                        checked
                          ? "bg-brand-50 dark:bg-brand-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.itemcode)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-brand-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-gray-700 dark:text-gray-300">
                        {item.itemcode}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                        {item.itemname}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-300">
                        {item.price.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 dark:text-gray-500">
                        {item.category ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            * Category chỉ để tham khảo. Sau khi import, gán category trong Supabase qua nút Edit.
          </p>
        </>
      )}

      {/* Footer */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose} disabled={importing}>
          Close
        </Button>
        {preview && preview.missingItems.length > 0 && (
          <Button
            size="sm"
            onClick={handleImport}
            disabled={selected.size === 0 || importing || loading}
          >
            {importing
              ? "Importing..."
              : `Import${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
        )}
      </div>
    </Modal>
  );
}
