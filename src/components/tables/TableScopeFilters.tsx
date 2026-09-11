"use client";

import React, { FC } from "react";
import UserSelectFilter, { EmployeeOption } from "../form/UserSelectFilter";

export type Tab = "all" | "mine" | "dept";
export type DeptOption = { id: number; deptname: string };

export const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "My Requests" },
  { key: "dept", label: "My Dept" },
];

export interface TableScopeFiltersProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  deptFilter: number | null;
  departments: DeptOption[];
  onDeptFilter: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  userFilter: string | null;
  availableEmployees: EmployeeOption[];
  employees: EmployeeOption[];
  onUserFilter: (userId: string | null) => void;
  profile: any;
  // Date filters for badges
  startDatePreset: string | null;
  startDateFrom: string | null;
  startDateTo: string | null;
  onClearStartDate: () => void;
  endDatePreset: string | null;
  endDateFrom: string | null;
  endDateTo: string | null;
  onClearEndDate: () => void;
}

const TableScopeFilters: FC<TableScopeFiltersProps> = ({
  activeTab,
  onTabChange,
  deptFilter,
  departments,
  onDeptFilter,
  userFilter,
  availableEmployees,
  employees,
  onUserFilter,
  profile,
  startDatePreset,
  startDateFrom,
  startDateTo,
  onClearStartDate,
  endDatePreset,
  endDateFrom,
  endDateTo,
  onClearEndDate,
}) => {
  const hasActiveFilters =
    activeTab !== "all" ||
    Boolean(deptFilter) ||
    Boolean(userFilter) ||
    Boolean(startDatePreset || startDateFrom || startDateTo) ||
    Boolean(endDatePreset || endDateFrom || endDateTo);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Tab switchers: All | My Requests | My Dept */}
      <div className="flex rounded-lg border border-gray-200 dark:border-white/[0.1] overflow-hidden">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200 dark:border-white/[0.1] cursor-pointer ${
              activeTab === key
                ? "bg-brand-500 text-white"
                : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.04]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dept dropdown — only visible when activeTab === "all" */}
      {activeTab === "all" && departments.length > 0 && (
        <select
          value={deptFilter ?? ""}
          onChange={onDeptFilter}
          className="text-xs border border-gray-200 dark:border-white/[0.1] rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.deptname}
            </option>
          ))}
        </select>
      )}

      {/* Requester filter — only visible when activeTab === "all" */}
      {activeTab === "all" && employees.length > 0 && (
        <UserSelectFilter
          users={availableEmployees}
          selectedUserId={userFilter}
          onSelect={onUserFilter}
          placeholder="All users"
        />
      )}

      {/* Active filter badges list */}
      {hasActiveFilters && (
        <span className="text-xs text-brand-500 font-medium flex items-center gap-1.5 flex-wrap">
          {activeTab === "mine" && `Requester: ${profile?.fullname ?? "me"}`}
          {activeTab === "dept" && `Dept: ${profile?.department?.deptname ?? "my dept"}`}
          {activeTab === "all" && (
            <>
              {deptFilter && (
                <span>
                  Dept: {departments.find((d) => d.id === deptFilter)?.deptname ?? ""}
                </span>
              )}
              {deptFilter && userFilter && (
                <span className="text-gray-300 dark:text-gray-600">•</span>
              )}
              {userFilter && (
                <span>
                  Requester: {employees.find((e) => e.user_id === userFilter)?.fullname ?? ""}
                </span>
              )}
            </>
          )}

          {/* Start Date active badge */}
          {(startDatePreset || startDateFrom || startDateTo) && (
            <>
              {(activeTab !== "all" || deptFilter || userFilter) && (
                <span className="text-gray-300 dark:text-gray-600">•</span>
              )}
              <span className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-500/20 text-[11px]">
                <span>
                  Start:{" "}
                  {startDatePreset === "upcoming"
                    ? "Starts in > 1 days"
                    : startDatePreset === "tomorrow"
                    ? "Starts tomorrow"
                    : startDatePreset === "actived"
                    ? "Actived"
                    : startDateFrom && startDateTo
                    ? `${startDateFrom} → ${startDateTo}`
                    : startDateFrom
                    ? `≥ ${startDateFrom}`
                    : `≤ ${startDateTo}`}
                </span>
                <button
                  type="button"
                  onClick={onClearStartDate}
                  className="hover:text-brand-700 dark:hover:text-brand-300 ml-0.5 font-bold cursor-pointer"
                  title="Clear Start date filter"
                >
                  ×
                </button>
              </span>
            </>
          )}

          {/* End Date active badge */}
          {(endDatePreset || endDateFrom || endDateTo) && (
            <>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-500/20 text-[11px]">
                <span>
                  End:{" "}
                  {endDatePreset === "running"
                    ? "Ends in > 1 days"
                    : endDatePreset === "tomorrow"
                    ? "Ends tomorrow"
                    : endDatePreset === "ended"
                    ? "Ended"
                    : endDateFrom && endDateTo
                    ? `${endDateFrom} → ${endDateTo}`
                    : endDateFrom
                    ? `≥ ${endDateFrom}`
                    : `≤ ${endDateTo}`}
                </span>
                <button
                  type="button"
                  onClick={onClearEndDate}
                  className="hover:text-brand-700 dark:hover:text-brand-300 ml-0.5 font-bold cursor-pointer"
                  title="Clear End date filter"
                >
                  ×
                </button>
              </span>
            </>
          )}
        </span>
      )}
    </div>
  );
};

export default TableScopeFilters;
