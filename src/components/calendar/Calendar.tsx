"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  EventClickArg,
  EventContentArg,
  DatesSetArg,
  MoreLinkContentArg,
} from "@fullcalendar/core";
import { supabase } from "@/lib/supabase/supabaseClient";

interface PromotionItem {
  reqdtlid: number | string;
  itemcode: string;
  itemname: string;
  description?: string;
  itemtype?: string;
  price?: number;
  discount?: number;
  startdate: string;
  enddate: string;
  requestcode?: string;
  promotionname?: string;
  requests?: {
    requestcode?: string;
    promotionname?: string;
  } | null;
}

interface CalendarEvent extends EventInput {
  extendedProps: {
    raw: PromotionItem;
    itemType: string;
  };
}

export default function Calendar() {
  const calendarRef = useRef<FullCalendar>(null);

  // States
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Slide-over Drawer States (For days with multiple items)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [drawerSearch, setDrawerSearch] = useState("");

  // Modal Item Detail
  const [activeItem, setActiveItem] = useState<PromotionItem | null>(null);

  // 1. Fetch only promotions whose STARTDATE falls within current visible range, along with request info
  const fetchPromotions = useCallback(async (startStr: string, endStr: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promotiondetail")
        .select(
          "reqdtlid, reqid, itemcode, itemname, description, itemtype, price, discount, startdate, enddate, requests(requestcode, promotionname)"
        )
        .not("startdate", "is", null)
        .gte("startdate", startStr)
        .lte("startdate", endStr);

      if (error) throw error;

      const mapped: CalendarEvent[] = (data ?? []).map((item: any) => {
        const type = (item.itemtype || "combo").toLowerCase();
        const eventDate = String(item.startdate).substring(0, 10);
        const reqObj = Array.isArray(item.requests) ? item.requests[0] : item.requests;

        const rawItem: PromotionItem = {
          ...item,
          requestcode: reqObj?.requestcode || "N/A",
          promotionname: reqObj?.promotionname || "N/A",
        };

        return {
          id: String(item.reqdtlid),
          title: item.itemname,
          start: eventDate, // STRICT REQUIREMENT: Only show on start date
          allDay: true,
          extendedProps: {
            raw: rawItem,
            itemType: type,
          },
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error("Error fetching promotions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDatesSet = (dateInfo: DatesSetArg) => {
    fetchPromotions(dateInfo.startStr, dateInfo.endStr);
  };

  // 2. Client-side Search & Filter
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = searchQuery.toLowerCase();
      const raw = ev.extendedProps.raw;
      const matchSearch =
        searchQuery === "" ||
        ev.title?.toLowerCase().includes(q) ||
        raw.itemcode?.toLowerCase().includes(q) ||
        raw.requestcode?.toLowerCase().includes(q) ||
        raw.promotionname?.toLowerCase().includes(q);

      const matchType =
        selectedType === "all" || ev.extendedProps.itemType === selectedType;

      return matchSearch && matchType;
    });
  }, [events, searchQuery, selectedType]);

  // 3. Open Slide-over Drawer for specific date
  const openDayDrawer = (dateStr: string) => {
    setSelectedDayDate(dateStr);
    setDrawerSearch("");
    setIsDrawerOpen(true);
  };

  // Filter items starting on the selected day
  const dayItems = useMemo(() => {
    if (!selectedDayDate) return [];

    return events
      .filter((ev) => {
        const sDate = String(ev.extendedProps.raw.startdate).substring(0, 10);
        return sDate === selectedDayDate;
      })
      .map((ev) => ev.extendedProps.raw)
      .filter((item) => {
        if (!drawerSearch) return true;
        const q = drawerSearch.toLowerCase();
        return (
          item.itemname?.toLowerCase().includes(q) ||
          item.itemcode?.toLowerCase().includes(q) ||
          item.requestcode?.toLowerCase().includes(q) ||
          item.promotionname?.toLowerCase().includes(q)
        );
      });
  }, [events, selectedDayDate, drawerSearch]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const raw = clickInfo.event.extendedProps.raw as PromotionItem;
    setActiveItem(raw);
  };

  // Micro UI Event Badge
  const renderEventContent = (eventInfo: EventContentArg) => {
    const type = eventInfo.event.extendedProps.itemType;
    const isCombo = type === "combo";

    return (
      <div
        className={`group flex items-center gap-1.5 w-full px-2 py-0.5 rounded-md text-xs font-medium border transition-all duration-150 hover:shadow-xs hover:scale-[1.01] cursor-pointer overflow-hidden ${
          isCombo
            ? "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
            : "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isCombo ? "bg-amber-500" : "bg-blue-500"
          }`}
        />
        <span className="truncate font-medium">{eventInfo.event.title}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* TOOLBAR HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Search by name, code or promotion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-10 px-3 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="combo">Combos</option>
            <option value="discount">Discounts</option>
          </select>
        </div>

        {/* Stats & Syncing Indicator */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <span>Showing:</span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">{filteredEvents.length}</span>
            <span>items</span>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {/* CALENDAR CONTAINER */}
      <div className="relative rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,listMonth",
          }}
          buttonText={{
            today: "Today",
            dayGridMonth: "Month",
            listMonth: "List",
          }}
          events={filteredEvents}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          dayMaxEvents={5} // Strict 5 rows limit: 5 events, or 4 events + 1 moreLink
          moreLinkContent={(args: MoreLinkContentArg) => `+${args.num} more`}
          moreLinkClick={(args) => {
            const d = args.date;
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            openDayDrawer(dateStr);
            return "none"; // Suppress default popover
          }}
          dateClick={(info) => {
            openDayDrawer(info.dateStr);
          }}
          height="auto"
        />
      </div>

      {/* COMPONENT-SCOPED CSS STYLES FOR MORE-LINK BADGE */}
      <style jsx global>{`
        .fc .fc-daygrid-more-link {
          display: inline-block !important;
          margin: 2px 0 1px 2px !important;
          padding: 2px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #d97706 !important;
          background-color: #fef3c7 !important;
          border: 1px solid #fde68a !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          transition: all 0.15s ease-in-out !important;
          text-decoration: none !important;
        }
        .fc .fc-daygrid-more-link:hover {
          background-color: #fde68a !important;
          color: #b45309 !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        }
        .dark .fc .fc-daygrid-more-link {
          color: #fcd34d !important;
          background-color: rgba(180, 83, 9, 0.25) !important;
          border-color: rgba(217, 119, 6, 0.4) !important;
        }
        .dark .fc .fc-daygrid-more-link:hover {
          background-color: rgba(180, 83, 9, 0.4) !important;
        }
      `}</style>

      {/* SLIDE-OVER DRAWER (For inspecting days with many items) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    Date: {selectedDayDate}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {dayItems.length} promotion(s) starting on this day
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Search */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <input
                  type="text"
                  placeholder="Filter items on this date..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                />
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {dayItems.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    No promotions found for this date.
                  </div>
                ) : (
                  dayItems.map((item) => (
                    <div
                      key={item.reqdtlid}
                      onClick={() => setActiveItem(item)}
                      className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 hover:border-brand-500/50 hover:shadow-xs cursor-pointer transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {item.itemcode}
                          </span>
                          {item.requestcode && item.requestcode !== "N/A" && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200/50">
                              {item.requestcode}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                          {item.itemtype || "Combo"}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">
                        {item.itemname}
                      </h4>
                      {item.promotionname && item.promotionname !== "N/A" && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          Promotion: <span className="font-medium text-gray-700 dark:text-gray-300">{item.promotionname}</span>
                        </p>
                      )}
                      {item.price !== undefined && item.price !== null && (
                        <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Price: {Number(item.price).toLocaleString("en-US")} VND
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                        <span>End Date: {item.enddate?.substring(0, 10) || "N/A"}</span>
                        <span className="text-brand-600 font-medium group-hover:underline">Details →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROMOTION DETAIL MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Promotion Details
              </h3>
              <button
                onClick={() => setActiveItem(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm">
              {/* Promotion Name */}
              <div>
                <label className="text-xs font-medium text-gray-400">Promotion Name</label>
                <div className="mt-0.5 font-bold text-gray-900 dark:text-white text-base">
                  {activeItem.promotionname && activeItem.promotionname !== "N/A"
                    ? activeItem.promotionname
                    : activeItem.itemname}
                </div>
              </div>

              {/* Request Code & Item Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400">Request Code</label>
                  <div className="mt-0.5 font-mono text-brand-600 dark:text-brand-400 font-bold text-sm">
                    {activeItem.requestcode || "N/A"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Item Code</label>
                  <div className="mt-0.5 font-mono text-gray-800 dark:text-gray-200 font-medium">
                    {activeItem.itemcode || "N/A"}
                  </div>
                </div>
              </div>

              {/* Item / Combo Name */}
              <div>
                <label className="text-xs font-medium text-gray-400">Item / Combo Name</label>
                <div className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">
                  {activeItem.itemname}
                </div>
              </div>

              {/* Type & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400">Type</label>
                  <div className="mt-0.5 capitalize text-gray-800 dark:text-gray-200">
                    {activeItem.itemtype || "Combo"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Price</label>
                  <div className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    {activeItem.price !== undefined && activeItem.price !== null
                      ? `${Number(activeItem.price).toLocaleString("en-US")} VND`
                      : "N/A"}
                  </div>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400">Start Date</label>
                  <div className="mt-0.5 text-gray-800 dark:text-gray-200 font-medium">
                    {activeItem.startdate ? activeItem.startdate.substring(0, 10) : "N/A"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">End Date</label>
                  <div className="mt-0.5 text-gray-800 dark:text-gray-200 font-medium">
                    {activeItem.enddate ? activeItem.enddate.substring(0, 10) : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
