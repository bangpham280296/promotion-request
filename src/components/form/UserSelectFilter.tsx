"use client";

import React, { useState, useRef, useEffect, useMemo, FC } from "react";

export interface EmployeeOption {
  user_id: string;
  fullname: string;
  employeecode: string;
  department_id: number | null;
}

interface UserSelectFilterProps {
  users: EmployeeOption[];
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
  placeholder?: string;
  className?: string;
}

const UserSelectFilter: FC<UserSelectFilterProps> = ({
  users,
  selectedUserId,
  onSelect,
  placeholder = "All requesters",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter users by search query (name or employee code)
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const query = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (u.fullname?.toLowerCase().includes(query) ?? false) ||
        (u.employeecode?.toLowerCase().includes(query) ?? false)
    );
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === selectedUserId),
    [users, selectedUserId]
  );

  const handleSelect = (userId: string | null) => {
    onSelect(userId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center justify-between gap-2 text-xs border rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[240px] ${selectedUser
          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
          : "border-gray-200 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/[0.2]"
          }`}
      >
        <span className="truncate font-medium">
          {selectedUser ? selectedUser.fullname : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedUser && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              title="Clear filter"
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/20 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""
              }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[260px] w-max max-w-[320px] rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60">
            <div className="relative">
              <svg
                className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Enter name"
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* User Options List */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {/* Quick reset / All requesters option */}
            <li
              onClick={() => handleSelect(null)}
              className={`cursor-pointer px-3 py-2 text-xs flex items-center justify-between transition-colors hover:bg-gray-100 dark:hover:bg-white/5 ${selectedUserId === null
                ? "bg-brand-50 text-brand-600 font-semibold dark:bg-brand-900/20 dark:text-brand-400"
                : "text-gray-700 dark:text-gray-300"
                }`}
            >
              <span>{placeholder}</span>
              {selectedUserId === null && (
                <svg className="w-3.5 h-3.5 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </li>

            {/* Filtered Users */}
            {filteredUsers.length === 0 ? (
              <li className="px-3 py-4 text-xs text-center text-gray-400 dark:text-gray-500">
                User not found
              </li>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = u.user_id === selectedUserId;
                return (
                  <li
                    key={u.user_id}
                    onClick={() => handleSelect(u.user_id)}
                    className={`cursor-pointer px-3 py-2 text-xs flex items-center justify-between gap-3 transition-colors hover:bg-gray-100 dark:hover:bg-white/5 ${isSelected
                      ? "bg-brand-50 text-brand-600 font-semibold dark:bg-brand-900/20 dark:text-brand-400"
                      : "text-gray-700 dark:text-gray-300"
                      }`}
                  >
                    <span className="truncate">{u.fullname}</span>
                    <span
                      className={`text-[11px] font-mono shrink-0 ${isSelected
                        ? "text-brand-500 dark:text-brand-400"
                        : "text-gray-400 dark:text-gray-500"
                        }`}
                    >
                      {u.employeecode || "—"}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserSelectFilter;
