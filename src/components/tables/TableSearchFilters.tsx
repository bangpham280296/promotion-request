"use client";

import React, { FC } from "react";
import Input from "../form/input/InputField";
import Select from "../form/Select";

export const pageSizeOptions = [
  { value: "10", label: "10 / page" },
  { value: "20", label: "20 / page" },
  { value: "30", label: "30 / page" },
  { value: "50", label: "50 / page" },
];

export const statusFilterOptions = [
  { value: "all", label: "All status" },
  { value: "1", label: "Actived" },
  { value: "2", label: "Inactive" },
];

export interface TableSearchFiltersProps {
  search: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  statusFilter: string;
  onStatusFilter: (val: string) => void;
  pageSize: number;
  onPageSizeChange: (val: string) => void;
}

const TableSearchFilters: FC<TableSearchFiltersProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilter,
  pageSize,
  onPageSizeChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <Input
        type="text"
        placeholder="Search by request code or promotion name..."
        value={search}
        onChange={onSearchChange}
      />
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-36">
          <Select
            options={statusFilterOptions}
            defaultValue={statusFilter}
            onChange={onStatusFilter}
          />
        </div>
        <div className="w-36">
          <Select
            options={pageSizeOptions}
            defaultValue={String(pageSize)}
            onChange={onPageSizeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default TableSearchFilters;
