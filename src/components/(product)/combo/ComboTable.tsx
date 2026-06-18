"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Pagination from "@/components/tables/Pagination";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import useProfile from "@/hooks/useProfile";
import { useCombos, PAGE_SIZE, type ComboRecord } from "@/hooks/useCombos";
import ComboDetailModal from "./ComboDetailModal";
import { usePOSVerify, type POSVerifyResult } from "@/hooks/usePOSVerify";

const PRESETS = [
  { value: "all", label: "All Combos", min: null as number | null, max: null as number | null },
  { value: "instore", label: "Instore", min: 10000, max: 19999 },
  { value: "online", label: "Online HD/AGG", min: 20000, max: 20999 },
  { value: "bigorder", label: "Big Order", min: 180000, max: 189999 },
  { value: "party", label: "Party", min: 21000, max: 21999 },
];

type SortField = "itemcode" | "itemname" | "price" | "startdate" | "enddate" | "posStatus";
type SortDir = "asc" | "desc";
type POSFilter = "matched" | "mismatch" | "not_found" | null;

function toLocalMidnight(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateStatus(startdate: string | null, enddate: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = startdate ? toLocalMidnight(startdate) : null;
  const end = enddate ? toLocalMidnight(enddate) : null;

  if (end && end < today) return { label: "Expired", color: "error" as const };
  if (start && start.getTime() === tomorrow.getTime()) return { label: "Start Tomorrow", color: "warning" as const };
  if (start && start > today) return { label: "Upcoming", color: "info" as const };
  if (start || end) return { label: "Active", color: "success" as const };
  return { label: "No Date", color: "warning" as const };
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

const REQ_STATUS_COLOR: Record<string, "success" | "warning" | "error"> = {
  approved: "success",
  pending: "warning",
  rejected: "error",
  inactive: "error",
};

export default function ComboTable() {
  const [search, setSearch] = useState("");
  const [minCode, setMinCode] = useState("");
  const [maxCode, setMaxCode] = useState("");
  const [selectKey, setSelectKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<ComboRecord | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [posFilter, setPosFilter] = useState<POSFilter>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { combos, totalCount, loading, error, fetchCombos } = useCombos();
  const { profile } = useProfile();
  const isAdmin = profile?.role === "admin";

  const { results: verifyResults, loading: verifying, error: verifyError, verifiedAt, verify } = usePOSVerify();
  const [expandedDiff, setExpandedDiff] = useState<number | null>(null);

  const verifyMap = useMemo(
    () => new Map<number, POSVerifyResult>(verifyResults.map((r) => [r.reqdtlid, r])),
    [verifyResults]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const displayedCombos = useMemo(() => {
    let list = [...combos];

    if (posFilter && verifyResults.length > 0) {
      list = list.filter((c) => verifyMap.get(c.reqdtlid)?.posStatus === posFilter);
    }

    if (sortField) {
      list.sort((a, b) => {
        let av: number | string = 0;
        let bv: number | string = 0;
        switch (sortField) {
          case "itemcode":
            av = parseInt(a.itemcode) || 0;
            bv = parseInt(b.itemcode) || 0;
            break;
          case "itemname":
            av = a.itemname ?? "";
            bv = b.itemname ?? "";
            break;
          case "price":
            av = a.price ?? 0;
            bv = b.price ?? 0;
            break;
          case "startdate":
            av = a.startdate ?? "";
            bv = b.startdate ?? "";
            break;
          case "enddate":
            av = a.enddate ?? "";
            bv = b.enddate ?? "";
            break;
          case "posStatus": {
            const order = { matched: 0, mismatch: 1, not_found: 2 };
            const ar = verifyMap.get(a.reqdtlid);
            const br = verifyMap.get(b.reqdtlid);
            av = ar ? order[ar.posStatus] : 3;
            bv = br ? order[br.posStatus] : 3;
            break;
          }
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [combos, posFilter, sortField, sortDir, verifyResults, verifyMap]);

  const handleVerifyPOS = () => {
    const input = combos.map((c) => ({
      reqdtlid: c.reqdtlid,
      itemcode: c.itemcode,
      itemname: c.itemname,
      enddate: c.enddate,
    }));
    verify(input);
    setExpandedDiff(null);
    setPosFilter(null);
  };

  const matchedCount = verifyResults.filter((r) => r.posStatus === "matched").length;
  const mismatchCount = verifyResults.filter((r) => r.posStatus === "mismatch").length;
  const notFoundCount = verifyResults.filter((r) => r.posStatus === "not_found").length;

  const parsedMin = minCode !== "" ? parseInt(minCode, 10) : null;
  const parsedMax = maxCode !== "" ? parseInt(maxCode, 10) : null;
  const hasRangeFilter = parsedMin !== null || parsedMax !== null;

  useEffect(() => {
    fetchCombos(currentPage, search, parsedMin, parsedMax);
  }, [currentPage, fetchCombos]);

  const triggerFetch = (page: number, s: string, min: number | null, max: number | null) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCombos(page, s, min, max), 300);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setCurrentPage(1);
    triggerFetch(1, value, parsedMin, parsedMax);
  };

  const handlePreset = (value: string) => {
    const preset = PRESETS.find((p) => p.value === value);
    if (!preset) return;
    setMinCode(preset.min !== null ? String(preset.min) : "");
    setMaxCode(preset.max !== null ? String(preset.max) : "");
    setCurrentPage(1);
    fetchCombos(1, search, preset.min, preset.max);
  };

  const handleMinCode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinCode(value);
    setSelectKey((k) => k + 1);
    setCurrentPage(1);
    const min = value !== "" ? parseInt(value, 10) : null;
    triggerFetch(1, search, min, parsedMax);
  };

  const handleMaxCode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxCode(value);
    setSelectKey((k) => k + 1);
    setCurrentPage(1);
    const max = value !== "" ? parseInt(value, 10) : null;
    triggerFetch(1, search, parsedMin, max);
  };

  const handleClearRange = () => {
    setMinCode("");
    setMaxCode("");
    setSelectKey((k) => k + 1);
    setCurrentPage(1);
    fetchCombos(1, search, null, null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setPosFilter(null);
  };

  const handleDeleted = () => {
    fetchCombos(currentPage, search, parsedMin, parsedMax);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasVerify = verifyResults.length > 0;
  const colSpan = hasVerify ? 10 : 9;

  // Sort indicator for column headers
  const SortIndicator = ({ field }: { field: SortField }) =>
    sortField === field ? (
      <span className="text-brand-500 text-[10px] ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>
    ) : (
      <span className="text-gray-300 dark:text-gray-600 text-[10px] ml-0.5">⇅</span>
    );

  const sortableThClass =
    "px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 cursor-pointer select-none whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-300 transition-colors";

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* Toolbar */}
        <div className="p-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-48">
            <Input
              type="text"
              placeholder="Search by combo code or name..."
              value={search}
              onChange={handleSearch}
            />
          </div>

          <div className="w-52">
            <Select
              key={selectKey}
              options={PRESETS}
              placeholder="Filter by type..."
              defaultValue=""
              onChange={handlePreset}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-28">
              <Input type="number" placeholder="From" min="0" value={minCode} onChange={handleMinCode} />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
            <div className="w-28">
              <Input type="number" placeholder="To" min="0" value={maxCode} onChange={handleMaxCode} />
            </div>
            {hasRangeFilter && (
              <button
                onClick={handleClearRange}
                className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 whitespace-nowrap transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {totalCount.toLocaleString()} combo{totalCount !== 1 ? "s" : ""}
          </span>

          {isAdmin && (
            <button
              onClick={handleVerifyPOS}
              disabled={verifying || combos.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-500 text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {verifying ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                "Verify POS"
              )}
            </button>
          )}
        </div>

        {verifyError && (
          <div className="px-4 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20">
            Verify error: {verifyError}
          </div>
        )}

        {/* Summary filter bar */}
        {hasVerify && !verifyError && (
          <div className="px-4 py-2 flex items-center gap-2 text-xs border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <button
              onClick={() => setPosFilter(posFilter === "matched" ? null : "matched")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
                posFilter === "matched"
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 ring-1 ring-green-400"
                  : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10"
              }`}
            >
              ✅ {matchedCount} matched
            </button>
            <button
              onClick={() => setPosFilter(posFilter === "mismatch" ? null : "mismatch")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
                posFilter === "mismatch"
                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 ring-1 ring-red-400"
                  : "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              }`}
            >
              ❌ {mismatchCount} mismatch
            </button>
            <button
              onClick={() => setPosFilter(posFilter === "not_found" ? null : "not_found")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
                posFilter === "not_found"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 ring-1 ring-orange-400"
                  : "text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10"
              }`}
            >
              ⚠️ {notFoundCount} not found
            </button>
            {posFilter && (
              <button
                onClick={() => setPosFilter(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 transition-colors"
              >
                Clear filter
              </button>
            )}
            {verifiedAt && (
              <span className="text-gray-400 ml-auto">
                Verified at: {new Date(verifiedAt).toLocaleString("vi-VN")}
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 w-12 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                  No.
                </TableCell>
                <th className={sortableThClass} onClick={() => handleSort("itemcode")}>
                  Combo Code <SortIndicator field="itemcode" />
                </th>
                <th className={sortableThClass} onClick={() => handleSort("itemname")}>
                  Combo Name <SortIndicator field="itemname" />
                </th>
                <th className={`${sortableThClass} text-end`} onClick={() => handleSort("price")}>
                  Price (VND) <SortIndicator field="price" />
                </th>
                <th className={sortableThClass} onClick={() => handleSort("startdate")}>
                  Start Date <SortIndicator field="startdate" />
                </th>
                <th className={sortableThClass} onClick={() => handleSort("enddate")}>
                  End Date <SortIndicator field="enddate" />
                </th>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                  Status
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                  Request Code
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                  Req Status
                </TableCell>
                {hasVerify && (
                  <th className={sortableThClass} onClick={() => handleSort("posStatus")}>
                    POS Status <SortIndicator field="posStatus" />
                  </th>
                )}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-8 text-center text-sm text-red-400">
                    Error: {error}
                  </td>
                </tr>
              ) : displayedCombos.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                    {posFilter ? "No combos match this filter." : "No combos found."}
                  </td>
                </tr>
              ) : (
                displayedCombos.map((combo, idx) => {
                  const dateStatus = getDateStatus(combo.startdate, combo.enddate);
                  const reqStatus = combo.requests?.stt?.name ?? "";
                  const reqStatusColor = REQ_STATUS_COLOR[reqStatus.toLowerCase()] ?? "warning";
                  const posResult = verifyMap.get(combo.reqdtlid);
                  const isExpanded = expandedDiff === combo.reqdtlid;

                  return (
                    <React.Fragment key={combo.reqdtlid}>
                      <TableRow
                        onClick={() => setSelected(combo)}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                      >
                        <TableCell className="px-5 py-3 text-center text-gray-400 text-theme-xs dark:text-gray-500">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="px-5 py-3 font-mono text-gray-700 text-theme-sm dark:text-gray-300 font-medium">
                          {combo.itemcode}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                          {combo.itemname}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-end text-gray-700 text-theme-sm dark:text-gray-300">
                          {combo.price != null ? combo.price.toLocaleString("vi-VN") : "—"}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          {formatDate(combo.startdate)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          {formatDate(combo.enddate)}
                        </TableCell>
                        <TableCell className="px-5 py-3">
                          <Badge color={dateStatus.color} size="sm">{dateStatus.label}</Badge>
                        </TableCell>
                        <TableCell className="px-5 py-3 font-mono text-gray-500 text-theme-sm dark:text-gray-400">
                          {combo.requests?.requestcode ?? "—"}
                        </TableCell>
                        <TableCell className="px-5 py-3">
                          {reqStatus ? (
                            <Badge color={reqStatusColor} size="sm">{reqStatus}</Badge>
                          ) : (
                            <span className="text-gray-400 text-theme-sm">—</span>
                          )}
                        </TableCell>
                        {hasVerify && (
                          <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                            {!posResult ? (
                              <span className="text-gray-300 text-theme-xs">—</span>
                            ) : posResult.posStatus === "matched" ? (
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">✅ Matched</span>
                            ) : posResult.posStatus === "not_found" ? (
                              <span className="text-xs font-medium text-orange-500">⚠️ Not Found</span>
                            ) : (
                              <button
                                onClick={() => setExpandedDiff(isExpanded ? null : combo.reqdtlid)}
                                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                              >
                                ❌ Mismatch
                                <span className="text-gray-400 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                              </button>
                            )}
                          </td>
                        )}
                      </TableRow>

                      {isExpanded && posResult?.differences && (
                        <tr className="bg-red-50/50 dark:bg-red-500/5">
                          <td colSpan={colSpan} className="px-8 py-3">
                            <table className="text-xs w-auto border border-red-200 dark:border-red-500/30 rounded-lg overflow-hidden">
                              <thead>
                                <tr className="bg-red-100/60 dark:bg-red-500/10">
                                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Field</th>
                                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Request (DB)</th>
                                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">POS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {posResult.differences.map((diff) => (
                                  <tr key={diff.field} className="border-t border-red-200/50 dark:border-red-500/20">
                                    <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">{diff.field}</td>
                                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{diff.requestValue}</td>
                                    <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-medium">{diff.posValue}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <ComboDetailModal
        isOpen={!!selected}
        combo={selected}
        onClose={() => setSelected(null)}
        onDeleted={handleDeleted}
        isAdmin={isAdmin}
      />
    </div>
  );
}
