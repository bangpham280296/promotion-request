"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { VoucherifyProduct } from "@/types/voucherify";

interface Props {
  value: string;                  // product name hiển thị
  searchProducts: (q: string) => Promise<VoucherifyProduct[]>;
  onSelect: (product: VoucherifyProduct) => void;
  placeholder?: string;
}

export default function ProductSearchInput({
  value,
  searchProducts,
  onSelect,
  placeholder = "Search product...",
}: Props) {
  const [query, setQuery]           = useState(value);
  const [results, setResults]       = useState<VoucherifyProduct[]>([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);

  // Sync nếu value thay đổi từ ngoài (clear)
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      setOpen(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim()) { setResults([]); return; }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await searchProducts(q);
          setResults(res);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [searchProducts]
  );

  const handleSelect = (p: VoucherifyProduct) => {
    setQuery(p.name);
    setOpen(false);
    setResults([]);
    onSelect(p);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {open && (loading || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.1] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
          )}
          {!loading && results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
            >
              <span className="font-medium">{p.name}</span>
              <span className="ml-2 text-xs text-gray-400 font-mono">{p.id}</span>
            </button>
          ))}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-3 py-2 text-xs text-gray-400">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
}
