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
import { EmployeeOption } from "../form/UserSelectFilter";
import { EyeIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import AdminRequestViewModal from "./AdminRequestViewModal";
import ColumnDateFilterPopover, { DateFilterValue } from "./ColumnDateFilterPopover";
import TableScopeFilters, { Tab, DeptOption } from "./TableScopeFilters";
import TableSearchFilters from "./TableSearchFilters";

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

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return getLocalDateString(d);
};

type FetchParams = {
  search: string;
  statusFilter: string;
  tab: Tab;
  deptId: number | null;
  userId: string | null;
  startDatePreset: string | null;
  startDateFrom: string | null;
  startDateTo: string | null;
  endDatePreset: string | null;
  endDateFrom: string | null;
  endDateTo: string | null;
  page: number;
  pageSize: number;
  currentUserId: string | null;
  currentUserDeptId: number | null;
};

export default function BasicTableOne() {
  const { user, profile } = useAuthContext();
  const isAdmin = profile?.role === "admin";

  // ── Data ──
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("1");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [deptFilter, setDeptFilter] = useState<number | null>(null);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // ── Date Filters ──
  const [startDatePreset, setStartDatePreset] = useState<string | null>(null);
  const [startDateFrom, setStartDateFrom] = useState<string | null>(null);
  const [startDateTo, setStartDateTo] = useState<string | null>(null);

  const [endDatePreset, setEndDatePreset] = useState<string | null>(null);
  const [endDateFrom, setEndDateFrom] = useState<string | null>(null);
  const [endDateTo, setEndDateTo] = useState<string | null>(null);

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Modal ──
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserId = user?.id ?? null;
  const currentUserDeptId = (profile?.department?.id ?? null) as number | null;

  // Cascading employees based on department filter
  const availableEmployees = React.useMemo(() => {
    if (deptFilter === null) return employees;
    return employees.filter((emp) => emp.department_id === deptFilter);
  }, [employees, deptFilter]);

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

    if (params.userId) {
      query = query.eq("requester", params.userId);
    }

    if (params.tab === "mine" && params.currentUserId) {
      query = query.eq("requester", params.currentUserId);
    } else if (params.tab === "dept" && params.currentUserDeptId) {
      query = query.eq("department", params.currentUserDeptId);
    } else if (params.tab === "all" && params.deptId) {
      query = query.eq("department", params.deptId);
    }

    const today = getLocalDateString();
    const tomorrow = getTomorrowDateString();

    // ── Start date filter ──
    if (params.startDatePreset) {
      if (params.startDatePreset === "upcoming") {
        query = query.gt("startdate", tomorrow);
      } else if (params.startDatePreset === "tomorrow") {
        query = query.eq("startdate", tomorrow);
      } else if (params.startDatePreset === "actived") {
        query = query.lte("startdate", today);
      }
    } else {
      if (params.startDateFrom) {
        query = query.gte("startdate", params.startDateFrom);
      }
      if (params.startDateTo) {
        query = query.lte("startdate", params.startDateTo);
      }
    }

    // ── End date filter ──
    if (params.endDatePreset) {
      if (params.endDatePreset === "running") {
        query = query.gt("enddate", tomorrow);
      } else if (params.endDatePreset === "tomorrow") {
        query = query.eq("enddate", tomorrow);
      } else if (params.endDatePreset === "ended") {
        query = query.lte("enddate", today);
      }
    } else {
      if (params.endDateFrom) {
        query = query.gte("enddate", params.endDateFrom);
      }
      if (params.endDateTo) {
        query = query.lte("enddate", params.endDateTo);
      }
    }

    const { data, count } = await query;
    setRequests(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, []);

  // ── Initial load: departments + employees + requests song song ──
  useEffect(() => {
    supabase
      .from("department")
      .select("id, deptname")
      .order("deptname")
      .then(({ data }) => setDepartments((data as DeptOption[]) ?? []));

    supabase
      .from("employees")
      .select("user_id, fullname, employeecode, department_id")
      .order("fullname")
      .then(({ data }) => setEmployees((data as EmployeeOption[]) ?? []));

    fetchRequests({
      search: "", statusFilter: "1", tab: "all",
      deptId: null, userId: null,
      startDatePreset: null, startDateFrom: null, startDateTo: null,
      endDatePreset: null, endDateFrom: null, endDateTo: null,
      page: 1, pageSize: 10,
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
      fetchRequests({
        search: value,
        statusFilter,
        tab: activeTab,
        deptId: deptFilter,
        userId: userFilter,
        startDatePreset,
        startDateFrom,
        startDateTo,
        endDatePreset,
        endDateFrom,
        endDateTo,
        page: 1,
        pageSize,
        currentUserId,
        currentUserDeptId,
      });
    }, 300);
  };

  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
    fetchRequests({
      search,
      statusFilter: val,
      tab: activeTab,
      deptId: deptFilter,
      userId: userFilter,
      startDatePreset,
      startDateFrom,
      startDateTo,
      endDatePreset,
      endDateFrom,
      endDateTo,
      page: 1,
      pageSize,
      currentUserId,
      currentUserDeptId,
    });
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const newDeptId = tab === "all" ? deptFilter : null;
    const newUserId = tab === "all" ? userFilter : null;
    if (tab !== "all") {
      setDeptFilter(null);
      setUserFilter(null);
    }
    setCurrentPage(1);
    fetchRequests({
      search,
      statusFilter,
      tab,
      deptId: newDeptId,
      userId: newUserId,
      startDatePreset,
      startDateFrom,
      startDateTo,
      endDatePreset,
      endDateFrom,
      endDateTo,
      page: 1,
      pageSize,
      currentUserId,
      currentUserDeptId,
    });
  };

  const handleDeptFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value ? Number(e.target.value) : null;
    setDeptFilter(deptId);
    let nextUserId = userFilter;
    if (deptId !== null && userFilter) {
      const currentUser = employees.find((emp) => emp.user_id === userFilter);
      if (currentUser && currentUser.department_id !== deptId) {
        nextUserId = null;
        setUserFilter(null);
      }
    }
    setCurrentPage(1);
    fetchRequests({
      search,
      statusFilter,
      tab: activeTab,
      deptId,
      userId: nextUserId,
      startDatePreset,
      startDateFrom,
      startDateTo,
      endDatePreset,
      endDateFrom,
      endDateTo,
      page: 1,
      pageSize,
      currentUserId,
      currentUserDeptId,
    });
  };

  const handleUserFilter = (userId: string | null) => {
    setUserFilter(userId);
    setCurrentPage(1);
    fetchRequests({
      search,
      statusFilter,
      tab: activeTab,
      deptId: deptFilter,
      userId,
      startDatePreset,
      startDateFrom,
      startDateTo,
      endDatePreset,
      endDateFrom,
      endDateTo,
      page: 1,
      pageSize,
      currentUserId,
      currentUserDeptId,
    });
  };

  const handleStartDateFilter = (filter: DateFilterValue) => {
    setStartDatePreset(filter.preset);
    setStartDateFrom(filter.from);
    setStartDateTo(filter.to);
    setCurrentPage(1);
    fetchRequests({
      search,
      statusFilter,
      tab: activeTab,
      deptId: deptFilter,
      userId: userFilter,
      startDatePreset: filter.preset,
      startDateFrom: filter.from,
      startDateTo: filter.to,
      endDatePreset,
      endDateFrom,
      endDateTo,
      page: 1,
      pageSize,
      currentUserId,
      currentUserDeptId,
    });
  };

  const handleEndDateFilter = (filter: DateFilterValue) => {
    setEndDatePreset(filter.preset);
    setEndDateFrom(filter.from);
    setEndDateTo(filter.to);
    setCurrentPage(1);
    fetchRequests({
      search,
      statusFilter,
      tab: activeTab,
      deptId: deptFilter,
      userId: userFilter,
      startDatePreset,
      startDateFrom,
      startDateTo,
      endDatePreset: filter.preset,
      endDateFrom: filter.from,
      endDateTo: filter.to,
      page: 1,
      pageSize,
      currentUserId,
      currentUserDeptId,
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRequests({
      search,
      statusFilter,
      tab: activeTab,
      deptId: deptFilter,
      userId: userFilter,
      startDatePreset,
      startDateFrom,
      startDateTo,
      endDatePreset,
      endDateFrom,
      endDateTo,
      page,
      pageSize,
      currentUserId,
      currentUserDeptId,
    });
  };

  const handlePageSizeChange = (val: string) => {
    const size = Number(val);
    setPageSize(size);
    setCurrentPage(1);
    fetchRequests({
      search,
      statusFilter,
      tab: activeTab,
      deptId: deptFilter,
      userId: userFilter,
      startDatePreset,
      startDateFrom,
      startDateTo,
      endDatePreset,
      endDateFrom,
      endDateTo,
      page: 1,
      pageSize: size,
      currentUserId,
      currentUserDeptId,
    });
  };

  // Inline update status + refresh current page
  const handleStatusChange = async (reqid: number, sttId: number) => {
    const res = await fetch("/api/requests/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reqid, sttId }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Failed to update status");
    }
    fetchRequests({
      search,
      statusFilter,
      tab: activeTab,
      deptId: deptFilter,
      userId: userFilter,
      startDatePreset,
      startDateFrom,
      startDateTo,
      endDatePreset,
      endDateFrom,
      endDateTo,
      page: currentPage,
      pageSize,
      currentUserId,
      currentUserDeptId,
    });
  };

  const handleViewDetail = (req: any) => {
    setSelectedReq(req);
    openModal();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      {/* Filter bar */}
      <div className="p-4 space-y-3">
        {/* Row 1: Tabs, Dept, Requester, Active Badges */}
        <TableScopeFilters
          activeTab={activeTab}
          onTabChange={handleTabChange}
          deptFilter={deptFilter}
          departments={departments}
          onDeptFilter={handleDeptFilter}
          userFilter={userFilter}
          availableEmployees={availableEmployees}
          employees={employees}
          onUserFilter={handleUserFilter}
          profile={profile}
          startDatePreset={startDatePreset}
          startDateFrom={startDateFrom}
          startDateTo={startDateTo}
          onClearStartDate={() =>
            handleStartDateFilter({ preset: null, from: null, to: null })
          }
          endDatePreset={endDatePreset}
          endDateFrom={endDateFrom}
          endDateTo={endDateTo}
          onClearEndDate={() =>
            handleEndDateFilter({ preset: null, from: null, to: null })
          }
        />

        {/* Row 2: Search, Status, Page size */}
        <TableSearchFilters
          search={search}
          onSearchChange={handleSearch}
          statusFilter={statusFilter}
          onStatusFilter={handleStatusFilter}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* Table */}
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1102px] min-h-[600px] flex flex-col justify-between">
            <Table>
              <TableHeader className="relative z-30 border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[190px] max-w-[190px]"
                  >
                    Request code
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Promotion name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Requester & Dept
                  </TableCell>
                  <TableCell
                    isHeader
                    className="relative z-30 px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Start date</span>
                      <ColumnDateFilterPopover
                        column="startdate"
                        label="Start date"
                        value={{
                          preset: startDatePreset,
                          from: startDateFrom,
                          to: startDateTo,
                        }}
                        onApply={handleStartDateFilter}
                        onReset={() =>
                          handleStartDateFilter({
                            preset: null,
                            from: null,
                            to: null,
                          })
                        }
                        align="left"
                      />
                    </div>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="relative z-30 px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>End date</span>
                      <ColumnDateFilterPopover
                        column="enddate"
                        label="End date"
                        value={{
                          preset: endDatePreset,
                          from: endDateFrom,
                          to: endDateTo,
                        }}
                        onApply={handleEndDateFilter}
                        onReset={() =>
                          handleEndDateFilter({
                            preset: null,
                            from: null,
                            to: null,
                          })
                        }
                        align="right"
                      />
                    </div>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Status
                  </TableCell>
                  {isAdmin && (
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Action
                    </TableCell>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading ? (
                  <TableRow className="h-[550px]">
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="px-5 py-8 text-center text-sm text-gray-400 h-[550px]"
                    >
                      <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[480px]">
                        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Loading requests...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow className="h-[550px]">
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="px-5 py-8 text-center text-sm text-gray-400 h-[550px]"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 h-full min-h-[480px]">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center mb-1 text-gray-400">
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          No requests found
                        </p>
                        <p className="text-xs text-gray-400 max-w-sm text-center">
                          Try adjusting your search query, status preset, or date range filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {requests.map((req) => {
                      const startDays = daysFromNow(req.startdate);
                      const endDays = daysFromNow(req.enddate);
                      return (
                        <TableRow className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors" key={req.reqid}>
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

                    {/* Placeholder rows to maintain stable 10-row height */}
                    {requests.length < 10 &&
                      Array.from({ length: 10 - requests.length }).map((_, idx) => (
                        <TableRow
                          key={`empty-row-${idx}`}
                          className="border-gray-100 dark:border-white/[0.04] pointer-events-none select-none h-[56px]"
                        >
                          <TableCell
                            colSpan={isAdmin ? 7 : 6}
                            className="px-5 py-3.5 h-[56px] text-transparent"
                          >
                            &nbsp;
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                )}
              </TableBody>
            </Table>
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
