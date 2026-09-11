"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { DownloadIcon, ArrowUpIcon } from "@/icons";
import { downloadModifierTemplate, parseModifierExcel } from "@/lib/excel/modifierExcel";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { ModifierMatrixFlatRow } from "@/types/modifier";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
};

interface ParsedGroupBatch {
  groupName: string;
  description?: string;
  status: number;
  baseItemCodes: string[];
  targetItems: Array<{ code: string; surcharge: number; isActive: boolean }>;
}

export default function ModifierImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewBatches, setPreviewBatches] = useState<ParsedGroupBatch[]>([]);
  const [invalidCodes, setInvalidCodes] = useState<string[]>([]);
  const [validCodeMap, setValidCodeMap] = useState<Map<string, number>>(new Map()); // code -> itemId
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsing(false);
    setImporting(false);
    setPreviewBatches([]);
    setInvalidCodes([]);
    setValidCodeMap(new Map());
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setParsing(true);
    setErrorMessage(null);

    try {
      const rows = await parseModifierExcel(selected);
      if (rows.length === 0) {
        throw new Error("No valid data rows found in the uploaded file.");
      }

      // Collect all distinct item codes
      const allItemCodes = new Set<string>();
      rows.forEach((r) => {
        if (r.baseItemCode) allItemCodes.add(r.baseItemCode.trim());
        if (r.targetItemCode) allItemCodes.add(r.targetItemCode.trim());
      });

      // Query DB for item codes existence
      const codesArray = Array.from(allItemCodes);
      const codeToId = new Map<string, number>();

      if (codesArray.length > 0) {
        const { data: dbItems, error: dbError } = await supabase
          .from("items")
          .select("id, itemcode")
          .in("itemcode", codesArray);

        if (dbError) throw dbError;

        (dbItems || []).forEach((item: any) => {
          if (item.itemcode) {
            codeToId.set(item.itemcode.trim(), item.id);
          }
        });
      }

      // Find missing / invalid codes
      const missing: string[] = [];
      codesArray.forEach((c) => {
        if (!codeToId.has(c)) {
          missing.push(c);
        }
      });

      setValidCodeMap(codeToId);
      setInvalidCodes(missing);

      // Group rows by groupName
      const groupsMap = new Map<string, ParsedGroupBatch>();
      rows.forEach((row) => {
        const key = row.groupName.trim();
        if (!groupsMap.has(key)) {
          const statusVal =
            row.status === 0 ||
            String(row.status).toLowerCase() === "0" ||
            String(row.status).toLowerCase() === "inactive" ||
            String(row.status).toLowerCase() === "off"
              ? 0
              : 1;

          groupsMap.set(key, {
            groupName: key,
            description: row.description,
            status: statusVal,
            baseItemCodes: [],
            targetItems: [],
          });
        }

        const current = groupsMap.get(key)!;
        if (row.baseItemCode && !current.baseItemCodes.includes(row.baseItemCode)) {
          current.baseItemCodes.push(row.baseItemCode);
        }

        if (row.targetItemCode) {
          const exists = current.targetItems.some((t) => t.code === row.targetItemCode);
          if (!exists) {
            current.targetItems.push({
              code: row.targetItemCode,
              surcharge: row.surcharge ?? 0,
              isActive: true,
            });
          }
        }
      });

      setPreviewBatches(Array.from(groupsMap.values()));
    } catch (err: any) {
      console.error("Error parsing file:", err);
      setErrorMessage(err.message || "Failed to parse Excel file.");
      setPreviewBatches([]);
    } finally {
      setParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (previewBatches.length === 0) return;
    setImporting(true);
    setErrorMessage(null);

    try {
      for (const batch of previewBatches) {
        // 1. Check or insert group
        const { data: existingGroup, error: findError } = await supabase
          .from("modifier_groups")
          .select("id")
          .eq("group_name", batch.groupName)
          .maybeSingle();

        if (findError) throw findError;

        let groupId: number;

        if (existingGroup) {
          groupId = existingGroup.id;
          // Update status / description if present
          await supabase
            .from("modifier_groups")
            .update({
              description: batch.description || undefined,
              status: batch.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", groupId);
        } else {
          const { data: newGroup, error: insertError } = await supabase
            .from("modifier_groups")
            .insert({
              group_name: batch.groupName,
              description: batch.description || null,
              status: batch.status,
            })
            .select("id")
            .single();

          if (insertError) throw insertError;
          groupId = newGroup.id;
        }

        // 2. Attach base items
        const validBaseIds = batch.baseItemCodes
          .map((code) => validCodeMap.get(code))
          .filter((id): id is number => id !== undefined);

        if (validBaseIds.length > 0) {
          const baseRows = validBaseIds.map((item_id) => ({
            group_id: groupId,
            item_id,
          }));

          await supabase
            .from("modifier_group_base_items")
            .upsert(baseRows, { onConflict: "group_id,item_id", ignoreDuplicates: true });
        }

        // 3. Attach target items
        for (let i = 0; i < batch.targetItems.length; i++) {
          const target = batch.targetItems[i];
          const targetItemId = validCodeMap.get(target.code);
          if (targetItemId !== undefined) {
            await supabase.from("modifier_group_items").upsert(
              {
                group_id: groupId,
                item_id: targetItemId,
                surcharge_price: target.surcharge,
                is_active: target.isActive,
                sort_order: i,
              },
              { onConflict: "group_id,item_id" }
            );
          }
        }
      }

      toast.success(
        `Imported ${previewBatches.length} modifier group(s) successfully.`
      );
      await onSuccess();
      handleClose();
    } catch (err: any) {
      console.error("Import error:", err);
      setErrorMessage(err.message || "Failed to commit import.");
    } finally {
      setImporting(false);
    }
  };

  const totalBaseCount = previewBatches.reduce((acc, b) => acc + b.baseItemCodes.length, 0);
  const totalTargetCount = previewBatches.reduce((acc, b) => acc + b.targetItems.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Import Modifier Matrix from Excel
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Upload a single-sheet Excel workbook to populate groups and price rules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => downloadModifierTemplate()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          Sample Template
        </button>
      </div>

      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-6 text-center hover:border-brand-500 hover:bg-brand-50/20 dark:border-white/[0.08] dark:hover:border-brand-500/50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10">
          <ArrowUpIcon className="w-5 h-5" />
        </div>
        <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">
          {file ? file.name : "Click to browse or drop an .xlsx file here"}
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          Supports single-sheet Excel files formatted with standard column headers
        </p>
      </div>

      {/* Parsing state */}
      {parsing && (
        <div className="py-4 text-center text-xs text-gray-500">
          Parsing and validating file rows...
        </div>
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="mt-3 rounded-lg bg-error-50 p-3 text-xs text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {errorMessage}
        </div>
      )}

      {/* Validation & Preview */}
      {previewBatches.length > 0 && (
        <div className="mt-4 space-y-3">
          {/* Summary metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-3 text-center">
              <p className="text-[11px] text-gray-400">Groups Found</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">
                {previewBatches.length}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-3 text-center">
              <p className="text-[11px] text-gray-400">Base Items</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">
                {totalBaseCount}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-3 text-center">
              <p className="text-[11px] text-gray-400">Trade-Up Options</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">
                {totalTargetCount}
              </p>
            </div>
          </div>

          {/* Invalid codes warning */}
          {invalidCodes.length > 0 && (
            <div className="rounded-lg bg-warning-50 border border-warning-200 p-3 text-xs text-warning-800 dark:bg-warning-500/10 dark:border-warning-500/20 dark:text-warning-300">
              <p className="font-semibold mb-1">
                Warning: {invalidCodes.length} product code(s) were not found in the catalog:
              </p>
              <p className="font-mono text-[11px] break-all">
                {invalidCodes.slice(0, 15).join(", ")}
                {invalidCodes.length > 15 ? ` and ${invalidCodes.length - 15} more...` : ""}
              </p>
              <p className="text-[11px] mt-1 text-warning-700 dark:text-warning-400">
                These unknown items will be skipped during import. Valid items will still be imported.
              </p>
            </div>
          )}

          {/* Preview list */}
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 dark:border-white/[0.05] divide-y divide-gray-100 dark:divide-white/[0.05]">
            {previewBatches.map((b, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 px-3 text-xs">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {b.groupName}
                  </span>
                  {b.description && (
                    <span className="text-gray-400 ml-2">({b.description})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span>{b.baseItemCodes.length} base</span>
                  <span>•</span>
                  <span>{b.targetItems.length} trade-up</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClose}
          disabled={importing}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleExecuteImport}
          disabled={importing || previewBatches.length === 0}
        >
          {importing ? "Importing Data..." : `Confirm & Import (${previewBatches.length} Groups)`}
        </Button>
      </div>
    </Modal>
  );
}
