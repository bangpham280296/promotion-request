"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useAuthContext } from "@/context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Pagination from "./Pagination";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import { EyeIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import AdminRequestViewModal from "./AdminRequestViewModal";

type Tab = "all" | "mine" | "dept";
type DeptOption = { id: number; deptname: string };

const TABS: { key: Tab; label: string }[] = [
  { key: "all",  label: "All" },
  { key: "mine", label: "My Requests" },
  { key: "dept", label: "My Dept" },
];

const pageSizeOptions = [
  { value: "10", label: "10 / page" },
  { value: "20", label: "20 / page" },
  { value: "30", label: "30 / page" },
  { value: "50", label: "50 / page" },
];

const statusFilterOptions = [
  { value: "all", label: "All status" },
  { value: "1",   label: "Actived" },
  { value: "2",   label: "Inactive" },
];

const statusBadgeColor = (name: string): "success" | "warning" | "error" | "info" => {
  const n = name.toLowerCase();
  if (n === "approved" || n === "actived" || n === "active") return "success";
  if (n === "rejected" || n === "inactive") return "error";
  if (n === "pending") return "warning";
  return "info";
};

const daysFromNow = (dateStr: string) =>
  Math.round(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
    (1000 * 60 * 60 * 24)
  );

type FetchParams = {
  search: string;
  statusFilter: string;
  tab: Tab;
  deptId: number | null;
  page: number;
  pageSize: number;
  currentUserId: string | null;
  currentUserDeptId: number | null;
};

export default function BasicTableOne() {
  const { user, profile } = useAuthContext();
  const isAdmin = profile?.role === "admin";

  // ── Data ──
  const [requests, setRequests]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ── Filters ──
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("1");
  const [activeTab, setActiveTab]     = useState<Tab>("all");
  const [deptFilter, setDeptFilter]   = useState<number | null>(null);
  const [departments, setDepartments] = useState<DeptOption[]>([]);

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(10);

  // ── Modal ──
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserId     = user?.id ?? null;
  const currentUserDeptId = (profile?.department?.id ?? null) as number | null;

  // ── Core fetch (all params explicit — no stale closure) ──
  const fetchRequests = useCallback(async (params: FetchParams) => {
    setLoading(true);
    const offset = (params.page - 1) * params.pageSize;

    let query = supabase
      .from("requests")
      .select(
        `reqid, requestcode, promotionname, startdate, enddate, createdate, updateat,
         department(deptname),
         employees:employees!request_requester_fkey(fullname),
         stt:status(id, name)`,
        { count: "exact" }
      )
      .order("reqid", { ascending: false })
      .range(offset, offset + params.pageSize - 1);

    if (params.search.trim()) {
      const t = params.search.trim();
      query = query.or(`requestcode.ilike.%${t}%,promotionname.ilike.%${t}%`);
    }

    if (params.statusFilter !== "all") {
      query = query.eq("stt", Number(params.statusFilter));
    }

    if (params.tab === "mine" && params.currentUserId) {
      query = query.eq("requester", params.currentUserId);
    } else if (params.tab === "dept" && params.currentUserDeptId) {
      query = query.eq("department", params.currentUserDeptId);
    } else if (params.tab === "all" && params.deptId) {
      query = query.eq("department", params.deptId);
    }

    const { data, count } = await query;
    setRequests(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, []);

  // ── Initial load: departments + requests song song ──
  useEffect(() => {
    supabase
      .from("department")
      .select("id, deptname")
      .order("deptname")
      .then(({ data }) => setDepartments((data as DeptOption[]) ?? []));

    fetchRequests({
      search: "", statusFilter: "1", tab: "all",
      deptId: null, page: 1, pageSize: 10,
      currentUserId: null, currentUserDeptId: null,
    });
  }, [fetchRequests]);

  // ── Cleanup debounce ──
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // ── Handlers ──

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchRequests({ search: value, statusFilter, tab: activeTab, deptId: deptFilter, page: 1, pageSize, currentUserId, currentUserDeptId });
    }, 300);
  };

  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
    fetchRequests({ search, statusFilter: val, tab: activeTab, deptId: deptFilter, page: 1, pageSize, currentUserId, currentUserDeptId });
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const newDeptId = tab === "all" ? deptFilter : null;
    if (tab !== "all") setDeptFilter(null);
    setCurrentPage(1);
    fetchRequests({ search, statusFilter, tab, deptId: newDeptId, page: 1, pageSize, currentUserId, currentUserDeptId });
  };

  const handleDeptFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value ? Number(e.target.value) : null;
    setDeptFilter(deptId);
    setCurrentPage(1);
    fetchRequests({ search, statusFilter, tab: activeTab, deptId, page: 1, pageSize, currentUserId, currentUserDeptId });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRequests({ search, statusFilter, tab: activeTab, deptId: deptFilter, page, pageSize, currentUserId, currentUserDeptId });
  };

  const handlePageSizeChange = (val: string) => {
    const size = Number(val);
    setPageSize(size);
    setCurrentPage(1);
    fetchRequests({ search, statusFilter, tab: activeTab, deptId: deptFilter, page: 1, pageSize: size, currentUserId, currentUserDeptId });
  };

  // Inline update status + refresh current page
  const handleStatusChange = async (reqid: number, sttId: number) => {
    const { error } = await supabase
      .from("requests")
      .update({ stt: sttId })
      .eq("reqid", reqid);
    if (error) throw error;
    fetchRequests({ search, statusFilter, tab: activeTab, deptId: deptFilter, page: currentPage, pageSize, currentUserId, currentUserDeptId });
  };

  const handleViewDetail = (req: any) => {
    setSelectedReq(req);
    openModal();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">

        {/* Filter bar */}
        <div className="p-4 space-y-3">

          {/* Row 1: Tabs + Dept dropdown */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 dark:border-white/[0.1] overflow-hidden">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200 dark:border-white/[0.1]
                    ${activeTab === key
                      ? "bg-brand-500 text-white"
                      : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Dept dropdown — chỉ hiện khi tab = All */}
            {activeTab === "all" && departments.length > 0 && (
              <select
                value={deptFilter ?? ""}
                onChange={handleDeptFilter}
                className="text-xs border border-gray-200 dark:border-white/[0.1] rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.deptname}</option>
                ))}
              </select>
            )}

            {/* Active filter badge */}
            {(activeTab !== "all" || deptFilter) && (
              <span className="text-xs text-brand-500 font-medium">
                {activeTab === "mine" && `Requester: ${profile?.fullname ?? "me"}`}
                {activeTab === "dept" && `Dept: ${profile?.department?.deptname ?? "my dept"}`}
                {activeTab === "all" && deptFilter && `Dept: ${departments.find(d => d.id === deptFilter)?.deptname ?? ""}`}
              </span>
            )}
          </div>

          {/* Row 2: Search + Status + Page size */}
          <div className="flex items-center justify-between gap-4">
            <Input
              type="text"
              placeholder="Search by request code or promotion name..."
              value={search}
              onChange={handleSearch}
            />
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-36">
                <Select
                  options={statusFilterOptions}
                  defaultValue="1"
                  onChange={handleStatusFilter}
                />
              </div>
              <div className="w-36">
                <Select
                  options={pageSizeOptions}
                  defaultValue="10"
                  onChange={handlePageSizeChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1102px]">
            {loading ? (
              <p className="p-6 text-sm text-gray-400 text-center">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">No requests found.</p>
            ) : (
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    {[
                      { label: "Request code",        cls: "w-[190px] max-w-[190px]" },
                      { label: "Promotion name",      cls: "" },
                      { label: "Requester & Dept",    cls: "" },
                      { label: "Start date",          cls: "" },
                      { label: "End date",            cls: "" },
                      { label: "Status",              cls: "" },
                    ].map(({ label, cls }) => (
                      <TableCell key={label} isHeader className={`px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 ${cls}`}>
                        {label}
                      </TableCell>
                    ))}
                    {isAdmin && (
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Action
                      </TableCell>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {requests.map((req) => {
                    const startDays = daysFromNow(req.startdate);
                    const endDays   = daysFromNow(req.enddate);
                    return (
                      <TableRow className="hover:bg-gray-100" key={req.reqid}>
                        <TableCell className="px-5 py-3 w-[190px] max-w-[190px] text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {req.requestcode}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {req.promotionname}
                        </TableCell>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {req.employees?.fullname}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {req.department?.deptname}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-start">
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">{req.startdate}</span>
                          <Badge color={startDays > 1 ? "success" : startDays === 1 ? "warning" : "error"}>
                            {startDays > 1 ? `Starts in ${startDays} days` : startDays === 1 ? "Starts tomorrow" : "Actived"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-start">
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">{req.enddate}</span>
                          <Badge color={endDays > 1 ? "success" : endDays === 1 ? "warning" : "error"}>
                            {endDays > 1 ? `Ends in ${endDays} days` : endDays === 1 ? "Ends tomorrow" : "Ended"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-start">
                          {req.stt ? (
                            <Badge color={statusBadgeColor(req.stt.name)}>
                              {req.stt.name.charAt(0).toUpperCase() + req.stt.name.slice(1)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-theme-xs">—</span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="px-5 py-3 text-start">
                            <div
                              className="relative inline-block group cursor-pointer"
                              onClick={() => handleViewDetail(req)}
                            >
                              <EyeIcon />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                View detail
                              </div>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Pagination + total count */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-400">
          {totalCount > 0
            ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} requests`
            : "No results"}
        </p>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      {isAdmin && (
        <AdminRequestViewModal
          isOpen={isOpen}
          onClose={closeModal}
          request={selectedReq}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
