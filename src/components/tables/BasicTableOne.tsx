"use client";

import React, { useState } from "react";
import useRequest from "@/hooks/useRequest";
import useProfile from "@/hooks/useProfile";
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

const statusBadgeColor = (name: string): "success" | "warning" | "error" | "info" => {
  if (name === "approved") return "success";
  if (name === "rejected") return "error";
  return "warning";
};

export default function BasicTableOne() {
  const { requests, loading, error, updateRequestStatus } = useRequest();
  const { profile } = useProfile();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const isAdmin = profile?.role === "admin";

  const pageSizeOptions = [
    { value: "10", label: "10 / page" },
    { value: "20", label: "20 / page" },
    { value: "30", label: "30 / page" },
    { value: "50", label: "50 / page" },
  ];

  const filteredData = requests.filter(
    (item) =>
      (item.requestcode ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.promotionname ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const daysFromNow = (dateStr: string) =>
    Math.round(
      (new Date(dateStr).setHours(0, 0, 0, 0) -
        new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
    );

  const handleViewDetail = (req: any) => {
    setSelectedReq(req);
    openModal();
  };

  if (loading) return <p className="p-4 text-sm text-gray-400">Loading...</p>;
  if (error) return <p className="p-4 text-sm text-red-400">Error: {error}</p>;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="p-4 flex items-center justify-between gap-4">
          <Input
            type="text"
            placeholder="Search..."
            className="border px-3 py-2 rounded"
            defaultValue={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <div className="w-36 shrink-0">
            <Select
              options={pageSizeOptions}
              defaultValue="10"
              onChange={(val) => {
                setItemsPerPage(Number(val));
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1102px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 w-[190px] max-w-[190px] font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Request code
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Promotion name
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Requester & Department
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Start date
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    End date
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Status
                  </TableCell>
                  {isAdmin && (
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Action
                    </TableCell>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedData.map((req) => {
                  const startDays = daysFromNow(req.startdate);
                  const endDays = daysFromNow(req.enddate);
                  return (
                    <TableRow className="hover:bg-gray-100" key={req.reqid}>
                      <TableCell className="px-5 py-3 w-[190px] max-w-[190px] text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {req.requestcode}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {req.promotionname}
                      </TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                              {req.employees?.fullname}
                            </span>
                            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                              {req.department?.deptname}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          {req.startdate}
                        </span>
                        <Badge color={startDays > 1 ? "success" : startDays === 1 ? "warning" : "error"}>
                          {startDays > 1 ? `Starts in ${startDays} days` : startDays === 1 ? "Starts tomorrow" : "Actived"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          {req.enddate}
                        </span>
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
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {isAdmin && (
        <AdminRequestViewModal
          isOpen={isOpen}
          onClose={closeModal}
          request={selectedReq}
          onStatusChange={updateRequestStatus}
        />
      )}
    </div>
  );
}
